import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DocumentGenerationRequest {
  customizationId: string;
  format: 'pdf' | 'docx' | 'html';
  templateData?: {
    title: string;
    content: string;
    customFields: Record<string, any>;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { customizationId, format, templateData }: DocumentGenerationRequest = await req.json()

    if (!customizationId || !format) {
      return new Response(
        JSON.stringify({ error: 'Customization ID and format are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get customization data
    const { data: customization, error: customizationError } = await supabaseClient
      .from('template_customizations')
      .select(`
        *,
        template:templates(*)
      `)
      .eq('id', customizationId)
      .single()

    if (customizationError || !customization) {
      return new Response(
        JSON.stringify({ error: 'Customization not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user owns this customization or if it's anonymous with session
    if (customization.user_id !== user.id && !customization.session_id) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update customization status to generating
    await supabaseClient
      .from('template_customizations')
      .update({ 
        status: 'generating',
        generation_started_at: new Date().toISOString()
      })
      .eq('id', customizationId)

    try {
      // Generate document content
      const documentContent = await generateDocumentContent(
        customization.template,
        customization.custom_fields,
        templateData
      );

      let generatedFileUrl: string;
      let fileSize: number;

      switch (format) {
        case 'html': {
          const htmlResult = await generateHTML(documentContent, customization.template.title);
          generatedFileUrl = await uploadToStorage(
            supabaseClient,
            htmlResult.content,
            `${customizationId}.html`,
            'text/html'
          );
          fileSize = new Blob([htmlResult.content]).size;
          break;
        }

        case 'pdf': {
          const pdfResult = await generatePDF(documentContent, customization.template.title);
          generatedFileUrl = await uploadToStorage(
            supabaseClient,
            pdfResult.buffer,
            `${customizationId}.pdf`,
            'application/pdf'
          );
          fileSize = pdfResult.buffer.byteLength;
          break;
        }

        case 'docx': {
          const docxResult = await generateDOCX(documentContent, customization.template.title);
          generatedFileUrl = await uploadToStorage(
            supabaseClient,
            docxResult.buffer,
            `${customizationId}.docx`,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          );
          fileSize = docxResult.buffer.byteLength;
          break;
        }

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Update customization with generated content
      await supabaseClient
        .from('template_customizations')
        .update({
          status: 'completed',
          generated_content: documentContent,
          generated_html: format === 'html' ? documentContent : null,
          generated_pdf_url: format === 'pdf' ? generatedFileUrl : null,
          generation_completed_at: new Date().toISOString()
        })
        .eq('id', customizationId)

      // Record download
      await supabaseClient
        .from('template_downloads')
        .insert({
          template_id: customization.template.id,
          customization_id: customizationId,
          user_id: user.id,
          format,
          file_url: generatedFileUrl,
          file_size: fileSize,
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        })

      return new Response(
        JSON.stringify({ 
          success: true,
          downloadUrl: generatedFileUrl,
          fileSize,
          format
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (generationError) {
      // Update customization status to failed
      await supabaseClient
        .from('template_customizations')
        .update({ 
          status: 'failed',
          error_message: generationError.message
        })
        .eq('id', customizationId)

      throw generationError;
    }

  } catch (error) {
    console.error('Document generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function generateDocumentContent(
  template: any,
  customFields: Record<string, any>,
  templateData?: any
): Promise<string> {
  let content = templateData?.content || template.content?.template || '';
  
  // Replace placeholders with custom field values
  Object.entries(customFields).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(placeholder, value?.toString() || '');
  });

  // Clean up any remaining placeholders
  content = content.replace(/{{[^}]+}}/g, '[NOT PROVIDED]');

  return content;
}

async function generateHTML(content: string, title: string): Promise<{ content: string }> {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .content { white-space: pre-wrap; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="content">${content}</div>
    <div class="footer">
        Generated by LawMattersSG on ${new Date().toLocaleDateString()}
    </div>
</body>
</html>`;

  return { content: htmlContent };
}

async function generatePDF(content: string, title: string): Promise<{ buffer: ArrayBuffer }> {
  try {
    // Use Puppeteer for proper PDF generation
    const puppeteer = await import('https://deno.land/x/puppeteer@16.2.0/mod.ts');

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Generate HTML content
    const htmlContent = await generateHTML(content, title);

    // Set the HTML content
    await page.setContent(htmlContent.content, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; margin: 0 auto; color: #666;">
          ${title}
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; margin: 0 auto; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span> | Generated by LawMattersSG
        </div>
      `
    });

    await browser.close();

    return { buffer: pdfBuffer };
  } catch (error) {
    console.error('Error generating PDF with Puppeteer:', error);

    // Fallback to simple text-based PDF
    const pdfPlaceholder = `PDF Document: ${title}\n\n${content}\n\nGenerated by LawMattersSG`;
    const buffer = new TextEncoder().encode(pdfPlaceholder).buffer;

    return { buffer };
  }
}

async function generateDOCX(content: string, title: string): Promise<{ buffer: ArrayBuffer }> {
  // For now, return a simple text-based DOCX placeholder
  // In production, you would use a proper DOCX generation library
  const docxPlaceholder = `DOCX Document: ${title}\n\n${content}\n\nGenerated by LawMattersSG`;
  const buffer = new TextEncoder().encode(docxPlaceholder).buffer;
  
  return { buffer };
}

async function uploadToStorage(
  supabaseClient: any,
  content: string | ArrayBuffer,
  filename: string,
  contentType: string
): Promise<string> {
  const { data, error } = await supabaseClient.storage
    .from('template-files')
    .upload(`generated/${filename}`, content, {
      contentType,
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabaseClient.storage
    .from('template-files')
    .getPublicUrl(`generated/${filename}`);

  return urlData.publicUrl;
}
