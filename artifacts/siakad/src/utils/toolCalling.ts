/**
 * AI Function Calling System
 * Allows AI to call tools for document generation, data queries, etc.
 */

export type ToolType = 
  | 'create_pamflet' 
  | 'create_sertifikat' 
  | 'create_surat' 
  | 'generate_logo' 
  | 'generate_poster' 
  | 'query_siswa' 
  | 'query_jadwal' 
  | 'generate_laporan'
  | 'create_pengumuman';

export interface ToolCall {
  type: ToolType;
  parameters: Record<string, any>;
  id?: string;
}

export interface ToolResult {
  type: ToolType;
  success: boolean;
  data?: any;
  error?: string;
  downloadUrl?: string;
}

export interface FunctionCallingResponse {
  hasToolCall: boolean;
  toolCalls: ToolCall[];
  textResponse: string;
}

/**
 * Definisi tools yang tersedia untuk AI
 */
export const AVAILABLE_TOOLS = {
  create_pamflet: {
    description: 'Buat pamflet atau pengumuman dalam format PDF',
    parameters: {
      title: 'Judul pamflet',
      content: 'Konten pamflet',
      type: 'pamflet | pengumuman | info'
    }
  },
  create_sertifikat: {
    description: 'Buat sertifikat penghargaan',
    parameters: {
      nama: 'Nama penerima sertifikat',
      prestasi: 'Jenis prestasi/penghargaan',
      tanggal: 'Tanggal pemberian'
    }
  },
  create_surat: {
    description: 'Buat surat resmi dari sekolah',
    parameters: {
      jenis: 'Jenis surat (rekomendasi, izin, putus, dll)',
      tujuan: 'Tujuan surat',
      content: 'Isi surat'
    }
  },
  generate_logo: {
    description: 'Generate logo sekolah menggunakan AI',
    parameters: {
      deskripsi: 'Deskripsi logo yang diinginkan',
      style: 'Gaya logo (modern, klasik, minimalis)'
    }
  },
  generate_poster: {
    description: 'Generate poster atau banner',
    parameters: {
      judul: 'Judul poster',
      deskripsi: 'Deskripsi konten',
      jenis: 'Jenis poster (pengumuman, info, promo)'
    }
  },
  query_siswa: {
    description: 'Query data siswa dari database',
    parameters: {
      filter: 'Filter pencarian (nama, kelas, status)',
      limit: 'Jumlah hasil (default: 10)'
    }
  },
  query_jadwal: {
    description: 'Query jadwal pelajaran atau acara',
    parameters: {
      tipe: 'Tipe jadwal (pelajaran, acara, ujian)',
      kelas: 'Kelas (opsional)'
    }
  },
  generate_laporan: {
    description: 'Generate laporan statistik',
    parameters: {
      jenis: 'Jenis laporan (siswa, akademik, keuangan)',
      periode: 'Periode laporan'
    }
  },
  create_pengumuman: {
    description: 'Buat pengumuman sekolah',
    parameters: {
      judul: 'Judul pengumuman',
      konten: 'Konten pengumuman',
      tingkat_urgensi: 'Urgensi (rendah, sedang, tinggi)'
    }
  }
};

/**
 * Extract tool calls dari AI response
 * Format: <tool_call type="..." params="..."> atau <use_tool name="..." params="...">
 */
export function extractToolCalls(response: string): FunctionCallingResponse {
  const toolCallRegex = /<tool_call type="([^"]+)" params='([^']+)'\/>/g;
  const altFormatRegex = /<use_tool name="([^"]+)"[^>]*>([^<]*)<\/use_tool>/g;

  const toolCalls: ToolCall[] = [];
  let match;

  // Try first format
  while ((match = toolCallRegex.exec(response)) !== null) {
    try {
      const params = JSON.parse(match[2]);
      toolCalls.push({
        type: match[1] as ToolType,
        parameters: params
      });
    } catch (e) {
      console.error('Failed to parse tool call params:', match[2]);
    }
  }

  // Try alternative format
  while ((match = altFormatRegex.exec(response)) !== null) {
    try {
      const params = JSON.parse(match[2]);
      toolCalls.push({
        type: match[1] as ToolType,
        parameters: params
      });
    } catch (e) {
      console.error('Failed to parse tool call params:', match[2]);
    }
  }

  // Remove tool call markers from text response
  const textResponse = response
    .replace(toolCallRegex, '')
    .replace(altFormatRegex, '')
    .trim();

  return {
    hasToolCall: toolCalls.length > 0,
    toolCalls,
    textResponse
  };
}

/**
 * Format system prompt untuk AI dengan tool information
 */
export function formatSystemPromptWithTools(basePrompt: string): string {
  const toolsDescription = Object.entries(AVAILABLE_TOOLS)
    .map(([name, tool]) => {
      const params = Object.entries(tool.parameters)
        .map(([key, desc]) => `  - ${key}: ${desc}`)
        .join('\n');
      return `\n**${name}**\n${tool.description}\nParameters:\n${params}`;
    })
    .join('\n');

  return `${basePrompt}

## Available Tools

${toolsDescription}

## Instructions

When the user asks you to create documents, generate images, or query data, you MUST use the appropriate tool.

Format your tool calls like this:
<tool_call type="TOOL_NAME" params='{"param1": "value1", "param2": "value2"}'/>

You can include tool calls anywhere in your response. After the tool call, provide a natural language response about what you're doing.

Examples:
- User: "Buat logo sekolah"
  Your response: "Saya akan membuat logo sekolah untuk Anda. <tool_call type="generate_logo" params='{"deskripsi": "Logo sekolah modern", "style": "modern"}'/>Logo sudah saya buat dalam format berkualitas tinggi."

- User: "Bikin pamflet penerimaan siswa"
  Your response: "Baik, saya akan membuat pamflet penerimaan siswa. <tool_call type="create_pamflet" params='{"title": "Penerimaan Siswa Baru", "content": "...konten...", "type": "pamflet"}'/>Pamflet telah dibuat dan siap diunduh.`;
}

/**
 * Process tool call hasil
 */
export async function processToolCall(toolCall: ToolCall, supabaseClient: any): Promise<ToolResult> {
  try {
    switch (toolCall.type) {
      case 'create_pamflet': {
        // Handle by frontend or edge function
        return {
          type: 'create_pamflet',
          success: true,
          data: {
            status: 'Document created',
            format: 'PDF',
            filename: `pamflet_${Date.now()}.pdf`
          }
        };
      }

      case 'query_siswa': {
        // Query from Supabase
        const { data, error } = await supabaseClient
          .from('siswa')
          .select('*')
          .limit(toolCall.parameters.limit || 10);

        if (error) throw error;
        return {
          type: 'query_siswa',
          success: true,
          data: data
        };
      }

      case 'query_jadwal': {
        const { data, error } = await supabaseClient
          .from('jadwal')
          .select('*')
          .eq('tipe', toolCall.parameters.tipe)
          .limit(20);

        if (error) throw error;
        return {
          type: 'query_jadwal',
          success: true,
          data: data
        };
      }

      default:
        return {
          type: toolCall.type,
          success: false,
          error: `Tool ${toolCall.type} not yet implemented`
        };
    }
  } catch (err: any) {
    return {
      type: toolCall.type,
      success: false,
      error: err.message
    };
  }
}

/**
 * Format tool results untuk AI context
 */
export function formatToolResultsForAI(results: ToolResult[]): string {
  return results
    .map((result) => {
      if (result.success) {
        return `✅ Tool ${result.type} succeeded:\n${JSON.stringify(result.data, null, 2)}`;
      } else {
        return `❌ Tool ${result.type} failed: ${result.error}`;
      }
    })
    .join('\n\n');
}
