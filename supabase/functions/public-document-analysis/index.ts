import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisRequest {
  sessionId: string;
  ipAddress: string;
  filename: string;
  fileSize: number;
  fileType: string;
  fileContent: string; // Base64 encoded file content
}

interface AnalysisResult {
  summary: string;
  keyWords: string[];
  documentType: string;
  textLength: number;
  ocrQuality: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { sessionId, ipAddress, filename, fileSize, fileType, fileContent }: AnalysisRequest = await req.json()

    // Validate required fields
    if (!sessionId || !ipAddress || !filename || !fileContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify session exists and is not expired
    const { data: session, error: sessionError } = await supabaseClient
      .from('public_analysis_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('ip_address', ipAddress)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check rate limits
    const { data: rateLimitData, error: rateLimitError } = await supabaseClient.functions.invoke('public-rate-limiter', {
      body: {
        ipAddress,
        action: 'check'
      }
    })

    if (rateLimitError || !rateLimitData?.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitData?.message || 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Starting analysis for file: ${filename}`)

    // Decode file content
    const fileBuffer = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0))

    // Extract text based on file type
    let extractedText = ''
    let ocrQuality = 0.8 // Default quality score

    if (fileType === 'application/pdf') {
      // For PDF files, we would use a PDF parsing library
      // For now, using a placeholder implementation
      extractedText = await extractTextFromPDF(fileBuffer)
      ocrQuality = 0.9
    } else if (fileType.startsWith('image/')) {
      // For images, we would use OCR (Tesseract.js or similar)
      // For now, using a placeholder implementation
      extractedText = await extractTextFromImage(fileBuffer, fileType)
      ocrQuality = 0.7
    } else {
      throw new Error('Unsupported file type')
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the document')
    }

    console.log(`Extracted ${extractedText.length} characters of text`)

    // Perform basic analysis
    const analysis = await performBasicAnalysis(extractedText)

    // Store the file in Supabase Storage
    const filePath = `${sessionId}/${filename}`
    const { error: uploadError } = await supabaseClient.storage
      .from('public-documents')
      .upload(filePath, fileBuffer, {
        contentType: fileType,
        upsert: false
      })

    if (uploadError) {
      console.error('File upload error:', uploadError)
      // Continue with analysis even if file upload fails
    }

    // Store analysis result in database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const { data: analysisRecord, error: insertError } = await supabaseClient
      .from('public_document_analyses')
      .insert({
        session_id: sessionId,
        ip_address: ipAddress,
        filename,
        file_size: fileSize,
        file_type: fileType,
        analysis_result: {
          summary: analysis.summary,
          keyWords: analysis.keyWords,
          textLength: extractedText.length,
          ocrQuality,
          documentType: analysis.documentType
        },
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to store analysis: ${insertError.message}`)
    }

    // Update session statistics
    await supabaseClient
      .from('public_analysis_sessions')
      .update({
        documents_analyzed: session.documents_analyzed + 1,
        total_storage_used: session.total_storage_used + fileSize,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    console.log(`Analysis completed for ${filename}`)

    return new Response(
      JSON.stringify({
        success: true,
        analysisId: analysisRecord.id,
        result: analysisRecord.analysis_result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Analysis error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Analysis failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Placeholder function for PDF text extraction
async function extractTextFromPDF(buffer: Uint8Array): Promise<string> {
  // In a real implementation, you would use a PDF parsing library like pdf-parse
  // For now, return a placeholder
  return `Extracted text from PDF document. This is a placeholder implementation. 
  In a real scenario, this would contain the actual text content extracted from the PDF file.
  The document appears to contain legal content with various clauses and provisions.
  This text extraction would be performed using a proper PDF parsing library.`
}

// Placeholder function for image OCR
async function extractTextFromImage(buffer: Uint8Array, mimeType: string): Promise<string> {
  // In a real implementation, you would use Tesseract.js or similar OCR library
  // For now, return a placeholder
  return `Extracted text from image document. This is a placeholder implementation.
  In a real scenario, this would contain the actual text content extracted from the image using OCR.
  The image appears to contain typed or handwritten text that has been processed through optical character recognition.
  This text extraction would be performed using a proper OCR library like Tesseract.js.`
}

// Basic analysis function for public users
async function performBasicAnalysis(text: string): Promise<AnalysisResult> {
  // Simple keyword extraction
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)

  const wordFreq: Record<string, number> = {}
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1
  })

  const keyWords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)

  // Basic document type classification
  const documentType = classifyDocumentType(text)

  // Generate simple summary
  const summary = generateSimpleSummary(text)

  return {
    summary,
    keyWords,
    documentType,
    textLength: text.length,
    ocrQuality: 0.8
  }
}

function classifyDocumentType(text: string): string {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('contract') || lowerText.includes('agreement')) {
    return 'Contract/Agreement'
  } else if (lowerText.includes('invoice') || lowerText.includes('bill')) {
    return 'Invoice/Bill'
  } else if (lowerText.includes('court') || lowerText.includes('legal')) {
    return 'Legal Document'
  } else if (lowerText.includes('letter') || lowerText.includes('correspondence')) {
    return 'Letter/Correspondence'
  } else {
    return 'General Document'
  }
}

function generateSimpleSummary(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
  const firstSentences = sentences.slice(0, 3).join('. ')
  
  if (firstSentences.length > 200) {
    return firstSentences.substring(0, 200) + '...'
  }
  
  return firstSentences + (sentences.length > 3 ? '...' : '')
}

/* To deploy this function:
1. Make sure you have the Supabase CLI installed
2. Run: supabase functions deploy public-document-analysis
3. Set the required environment variables:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
*/
