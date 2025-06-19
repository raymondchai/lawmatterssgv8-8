import { chatWithAI } from '@/lib/api/openai';
import { templatesApi } from '@/lib/api/templates';
import type { Template } from '@/types';

export interface TemplateGenerationRequest {
  type: string;
  parties: {
    party1?: string;
    party2?: string;
    [key: string]: any;
  };
  terms: {
    duration?: string;
    amount?: string;
    jurisdiction?: string;
    [key: string]: any;
  };
  customRequirements?: string;
  language?: 'english' | 'simplified';
  jurisdiction?: 'singapore' | 'international';
}

export interface GeneratedTemplate {
  name: string;
  content: string;
  variables: string[];
  category: string;
  description: string;
  confidence: number;
}

/**
 * Generate a legal template using AI
 */
export async function generateTemplate(request: TemplateGenerationRequest): Promise<GeneratedTemplate> {
  const prompt = buildTemplatePrompt(request);
  
  try {
    const response = await chatWithAI(prompt, [], []);
    
    // Parse the AI response to extract template components
    const template = parseTemplateResponse(response.message, request);
    
    return {
      ...template,
      confidence: response.confidence
    };
  } catch (error) {
    console.error('Template generation failed:', error);
    throw new Error('Failed to generate template');
  }
}

/**
 * Build the prompt for template generation
 */
function buildTemplatePrompt(request: TemplateGenerationRequest): string {
  const {
    type,
    parties,
    terms,
    customRequirements,
    language = 'english',
    jurisdiction = 'singapore'
  } = request;

  let prompt = `Generate a professional legal ${type} template for ${jurisdiction === 'singapore' ? 'Singapore' : 'international'} use. `;
  
  if (language === 'simplified') {
    prompt += 'Use clear, simple language that non-lawyers can understand. ';
  } else {
    prompt += 'Use standard legal terminology and formal language. ';
  }

  prompt += '\n\nTemplate Requirements:\n';
  prompt += `- Document Type: ${type}\n`;
  
  if (parties.party1 || parties.party2) {
    prompt += '- Parties:\n';
    if (parties.party1) prompt += `  - First Party: Use variable {{party1_name}} for ${parties.party1}\n`;
    if (parties.party2) prompt += `  - Second Party: Use variable {{party2_name}} for ${parties.party2}\n`;
  }

  if (Object.keys(terms).length > 0) {
    prompt += '- Key Terms:\n';
    Object.entries(terms).forEach(([key, value]) => {
      if (value) {
        prompt += `  - ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: Use variable {{${key}}} for ${value}\n`;
      }
    });
  }

  if (customRequirements) {
    prompt += `- Additional Requirements: ${customRequirements}\n`;
  }

  prompt += '\nInstructions:\n';
  prompt += '1. Create a complete, legally sound template\n';
  prompt += '2. Use variables in double curly braces {{variable_name}} for customizable fields\n';
  prompt += '3. Include all necessary legal clauses and provisions\n';
  prompt += '4. Ensure compliance with Singapore law (if applicable)\n';
  prompt += '5. Add appropriate signature blocks and date fields\n';
  prompt += '6. Include clear section headings and numbering\n\n';

  prompt += 'Format your response as JSON with the following structure:\n';
  prompt += '{\n';
  prompt += '  "name": "Template name",\n';
  prompt += '  "description": "Brief description of the template",\n';
  prompt += '  "category": "Template category (contracts, employment, corporate, etc.)",\n';
  prompt += '  "content": "Full template content with variables",\n';
  prompt += '  "variables": ["list", "of", "variable", "names"]\n';
  prompt += '}\n\n';

  prompt += 'Respond with valid JSON only, no additional text.';

  return prompt;
}

/**
 * Parse the AI response to extract template components
 */
function parseTemplateResponse(response: string, request: TemplateGenerationRequest): Omit<GeneratedTemplate, 'confidence'> {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(response);
    
    return {
      name: parsed.name || `${request.type} Template`,
      content: parsed.content || response,
      variables: parsed.variables || extractVariablesFromContent(parsed.content || response),
      category: parsed.category || categorizeTemplate(request.type),
      description: parsed.description || `AI-generated ${request.type} template`
    };
  } catch (error) {
    // If JSON parsing fails, treat the entire response as content
    console.warn('Failed to parse JSON response, using raw content');
    
    return {
      name: `${request.type} Template`,
      content: response,
      variables: extractVariablesFromContent(response),
      category: categorizeTemplate(request.type),
      description: `AI-generated ${request.type} template`
    };
  }
}

/**
 * Extract variables from template content
 */
function extractVariablesFromContent(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = content.match(variableRegex) || [];
  return [...new Set(matches.map(match => match.replace(/[{}]/g, '').trim()))];
}

/**
 * Categorize template based on type
 */
function categorizeTemplate(type: string): string {
  const typeMap: Record<string, string> = {
    'contract': 'contracts',
    'agreement': 'contracts',
    'employment contract': 'employment',
    'service agreement': 'contracts',
    'nda': 'contracts',
    'non-disclosure agreement': 'contracts',
    'lease agreement': 'real-estate',
    'rental agreement': 'real-estate',
    'purchase agreement': 'real-estate',
    'partnership agreement': 'corporate',
    'shareholder agreement': 'corporate',
    'articles of incorporation': 'corporate',
    'trademark application': 'intellectual-property',
    'copyright notice': 'intellectual-property',
    'privacy policy': 'compliance',
    'terms of service': 'compliance',
    'will': 'personal',
    'power of attorney': 'personal'
  };

  const normalizedType = type.toLowerCase();
  return typeMap[normalizedType] || 'other';
}

/**
 * Suggest template improvements using AI
 */
export async function suggestTemplateImprovements(template: Template): Promise<string[]> {
  const prompt = `Review this legal template and suggest improvements:

Template Name: ${template.name}
Category: ${template.category}
Content:
${template.content}

Please provide 3-5 specific suggestions to improve this template, focusing on:
1. Legal completeness and accuracy
2. Clarity and readability
3. Missing clauses or provisions
4. Singapore law compliance (if applicable)
5. Variable placement and naming

Format your response as a simple list of suggestions, one per line.`;

  try {
    const response = await chatWithAI(prompt, [], []);
    
    // Split response into individual suggestions
    const suggestions = response.message
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(suggestion => suggestion.length > 10);

    return suggestions;
  } catch (error) {
    console.error('Failed to generate template suggestions:', error);
    return [];
  }
}

/**
 * Generate template variations
 */
export async function generateTemplateVariations(
  baseTemplate: Template,
  variations: string[]
): Promise<GeneratedTemplate[]> {
  const results: GeneratedTemplate[] = [];

  for (const variation of variations) {
    try {
      const prompt = `Create a variation of this legal template:

Base Template: ${baseTemplate.name}
Original Content:
${baseTemplate.content}

Variation Request: ${variation}

Create a modified version that incorporates the requested changes while maintaining legal validity.
Format your response as JSON with: name, description, category, content, variables.`;

      const response = await chatWithAI(prompt, [], []);
      const template = parseTemplateResponse(response.message, {
        type: baseTemplate.category,
        parties: {},
        terms: {}
      });

      results.push({
        ...template,
        confidence: response.confidence
      });
    } catch (error) {
      console.error(`Failed to generate variation: ${variation}`, error);
    }
  }

  return results;
}

/**
 * Save generated template to database
 */
export async function saveGeneratedTemplate(
  generatedTemplate: GeneratedTemplate,
  isPublic: boolean = false
): Promise<Template> {
  try {
    const templateData = {
      name: generatedTemplate.name,
      description: generatedTemplate.description,
      category: generatedTemplate.category,
      content: generatedTemplate.content,
      variables: generatedTemplate.variables,
      is_public: isPublic
    } as any;

    const savedTemplate = await templatesApi.createTemplate(templateData);
    return savedTemplate;
  } catch (error) {
    console.error('Failed to save generated template:', error);
    throw new Error('Failed to save template');
  }
}

/**
 * Get template generation suggestions based on user's documents
 */
export async function getTemplateGenerationSuggestions(
  userDocuments: any[]
): Promise<string[]> {
  if (userDocuments.length === 0) {
    return getDefaultTemplateSuggestions();
  }

  // Analyze user's documents to suggest relevant templates
  const documentTypes = userDocuments
    .map(doc => doc.document_type || 'unknown')
    .filter(type => type !== 'unknown');

  const uniqueTypes = [...new Set(documentTypes)];
  
  const suggestions: string[] = [];
  
  uniqueTypes.forEach(type => {
    switch (type.toLowerCase()) {
      case 'contract':
        suggestions.push('Service Agreement Template', 'Consulting Agreement Template');
        break;
      case 'employment':
        suggestions.push('Employment Contract Template', 'Non-Disclosure Agreement Template');
        break;
      case 'corporate':
        suggestions.push('Partnership Agreement Template', 'Shareholder Agreement Template');
        break;
      default:
        suggestions.push('General Contract Template');
    }
  });

  return suggestions.length > 0 ? suggestions : getDefaultTemplateSuggestions();
}

/**
 * Get default template suggestions
 */
function getDefaultTemplateSuggestions(): string[] {
  return [
    'Service Agreement Template',
    'Non-Disclosure Agreement Template',
    'Employment Contract Template',
    'Consulting Agreement Template',
    'Partnership Agreement Template',
    'Terms of Service Template',
    'Privacy Policy Template',
    'Lease Agreement Template'
  ];
}
