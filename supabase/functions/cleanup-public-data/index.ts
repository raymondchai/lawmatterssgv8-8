import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupStats {
  deletedAnalyses: number;
  deletedSessions: number;
  deletedFiles: number;
  errors: string[];
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

    const now = new Date().toISOString()
    const stats: CleanupStats = {
      deletedAnalyses: 0,
      deletedSessions: 0,
      deletedFiles: 0,
      errors: []
    }

    console.log('Starting cleanup of expired public data...')

    // 1. Get expired analyses to clean up their storage files
    const { data: expiredAnalyses, error: analysesQueryError } = await supabaseClient
      .from('public_document_analyses')
      .select('id, session_id')
      .lt('expires_at', now)

    if (analysesQueryError) {
      stats.errors.push(`Failed to query expired analyses: ${analysesQueryError.message}`)
    } else if (expiredAnalyses && expiredAnalyses.length > 0) {
      console.log(`Found ${expiredAnalyses.length} expired analyses`)

      // Clean up storage files for expired analyses
      for (const analysis of expiredAnalyses) {
        try {
          // List files in the session folder
          const { data: files, error: listError } = await supabaseClient.storage
            .from('public-documents')
            .list(analysis.session_id)

          if (listError) {
            stats.errors.push(`Failed to list files for session ${analysis.session_id}: ${listError.message}`)
            continue
          }

          if (files && files.length > 0) {
            // Delete all files in the session folder
            const filePaths = files.map(file => `${analysis.session_id}/${file.name}`)
            
            const { error: deleteError } = await supabaseClient.storage
              .from('public-documents')
              .remove(filePaths)

            if (deleteError) {
              stats.errors.push(`Failed to delete files for session ${analysis.session_id}: ${deleteError.message}`)
            } else {
              stats.deletedFiles += files.length
              console.log(`Deleted ${files.length} files for session ${analysis.session_id}`)
            }
          }
        } catch (error) {
          stats.errors.push(`Error processing files for session ${analysis.session_id}: ${error.message}`)
        }
      }

      // 2. Delete expired document analyses
      const { error: deleteAnalysesError } = await supabaseClient
        .from('public_document_analyses')
        .delete()
        .lt('expires_at', now)

      if (deleteAnalysesError) {
        stats.errors.push(`Failed to delete expired analyses: ${deleteAnalysesError.message}`)
      } else {
        stats.deletedAnalyses = expiredAnalyses.length
        console.log(`Deleted ${stats.deletedAnalyses} expired analyses`)
      }
    }

    // 3. Get expired sessions
    const { data: expiredSessions, error: sessionsQueryError } = await supabaseClient
      .from('public_analysis_sessions')
      .select('id')
      .lt('expires_at', now)

    if (sessionsQueryError) {
      stats.errors.push(`Failed to query expired sessions: ${sessionsQueryError.message}`)
    } else if (expiredSessions && expiredSessions.length > 0) {
      console.log(`Found ${expiredSessions.length} expired sessions`)

      // Clean up any remaining storage folders for expired sessions
      for (const session of expiredSessions) {
        try {
          const { data: files, error: listError } = await supabaseClient.storage
            .from('public-documents')
            .list(session.id)

          if (!listError && files && files.length > 0) {
            const filePaths = files.map(file => `${session.id}/${file.name}`)
            
            const { error: deleteError } = await supabaseClient.storage
              .from('public-documents')
              .remove(filePaths)

            if (deleteError) {
              stats.errors.push(`Failed to delete remaining files for session ${session.id}: ${deleteError.message}`)
            } else {
              stats.deletedFiles += files.length
              console.log(`Deleted ${files.length} remaining files for session ${session.id}`)
            }
          }
        } catch (error) {
          stats.errors.push(`Error cleaning up session ${session.id}: ${error.message}`)
        }
      }

      // Delete expired sessions
      const { error: deleteSessionsError } = await supabaseClient
        .from('public_analysis_sessions')
        .delete()
        .lt('expires_at', now)

      if (deleteSessionsError) {
        stats.errors.push(`Failed to delete expired sessions: ${deleteSessionsError.message}`)
      } else {
        stats.deletedSessions = expiredSessions.length
        console.log(`Deleted ${stats.deletedSessions} expired sessions`)
      }
    }

    // 4. Clean up orphaned storage files (files without corresponding database records)
    try {
      const { data: allFolders, error: listFoldersError } = await supabaseClient.storage
        .from('public-documents')
        .list()

      if (listFoldersError) {
        stats.errors.push(`Failed to list storage folders: ${listFoldersError.message}`)
      } else if (allFolders && allFolders.length > 0) {
        console.log(`Checking ${allFolders.length} storage folders for orphaned files`)

        for (const folder of allFolders) {
          if (folder.name && folder.name.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
            // Check if session still exists
            const { data: session, error: sessionCheckError } = await supabaseClient
              .from('public_analysis_sessions')
              .select('id')
              .eq('id', folder.name)
              .single()

            if (sessionCheckError && sessionCheckError.code === 'PGRST116') {
              // Session doesn't exist, clean up the folder
              const { data: files, error: listFilesError } = await supabaseClient.storage
                .from('public-documents')
                .list(folder.name)

              if (!listFilesError && files && files.length > 0) {
                const filePaths = files.map(file => `${folder.name}/${file.name}`)
                
                const { error: deleteOrphanedError } = await supabaseClient.storage
                  .from('public-documents')
                  .remove(filePaths)

                if (deleteOrphanedError) {
                  stats.errors.push(`Failed to delete orphaned files in folder ${folder.name}: ${deleteOrphanedError.message}`)
                } else {
                  stats.deletedFiles += files.length
                  console.log(`Deleted ${files.length} orphaned files from folder ${folder.name}`)
                }
              }
            }
          }
        }
      }
    } catch (error) {
      stats.errors.push(`Error during orphaned files cleanup: ${error.message}`)
    }

    console.log('Cleanup completed:', stats)

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Cleanup function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* To deploy this function:
1. Make sure you have the Supabase CLI installed
2. Run: supabase functions deploy cleanup-public-data
3. Set up a cron job to call this function regularly (e.g., every hour)
4. Set the required environment variables:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

Example cron setup (using GitHub Actions or similar):
- Schedule: "0 * * * *" (every hour)
- Call: POST https://your-project.supabase.co/functions/v1/cleanup-public-data
*/
