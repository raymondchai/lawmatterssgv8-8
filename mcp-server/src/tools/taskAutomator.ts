import { promises as fs } from 'fs';
import { join, dirname } from 'path';

export class TaskAutomator {
  async generateComponent(args: {
    componentName?: string;
    componentType?: 'functional' | 'class';
    includeTests?: boolean;
    includeStories?: boolean;
  }): Promise<any> {
    const {
      componentName = 'NewComponent',
      componentType = 'functional',
      includeTests = true,
      includeStories = false,
    } = args;

    try {
      const componentDir = join('src/components', componentName);
      await fs.mkdir(componentDir, { recursive: true });

      // Generate component file
      const componentContent = this.generateComponentContent(componentName, componentType);
      await fs.writeFile(join(componentDir, `${componentName}.tsx`), componentContent);

      // Generate index file
      const indexContent = `export { ${componentName} } from './${componentName}';\n`;
      await fs.writeFile(join(componentDir, 'index.ts'), indexContent);

      // Generate test file if requested
      if (includeTests) {
        const testContent = this.generateTestContent(componentName);
        await fs.writeFile(join(componentDir, `${componentName}.test.tsx`), testContent);
      }

      // Generate Storybook stories if requested
      if (includeStories) {
        const storyContent = this.generateStoryContent(componentName);
        await fs.writeFile(join(componentDir, `${componentName}.stories.tsx`), storyContent);
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Component ${componentName} generated successfully!\n\nFiles created:\n- ${componentName}.tsx\n- index.ts${includeTests ? `\n- ${componentName}.test.tsx` : ''}${includeStories ? `\n- ${componentName}.stories.tsx` : ''}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Component generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createApiEndpoint(args: {
    endpointName?: string;
    methods?: string[];
    includeAuth?: boolean;
  }): Promise<any> {
    const { endpointName = 'newEndpoint', methods = ['GET'], includeAuth = true } = args;

    try {
      const apiDir = join('src/lib/api');
      await fs.mkdir(apiDir, { recursive: true });

      const apiContent = this.generateApiContent(endpointName, methods, includeAuth);
      await fs.writeFile(join(apiDir, `${endpointName}.ts`), apiContent);

      // Update API index file
      await this.updateApiIndex(endpointName);

      return {
        content: [
          {
            type: 'text',
            text: `✅ API endpoint ${endpointName} generated successfully!\n\nSupported methods: ${methods.join(', ')}\nAuthentication: ${includeAuth ? 'Enabled' : 'Disabled'}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`API endpoint generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generateComponentContent(componentName: string, componentType: 'functional' | 'class'): string {
    if (componentType === 'functional') {
      return `import React from 'react';

interface ${componentName}Props {
  // Add your props here
}

export const ${componentName}: React.FC<${componentName}Props> = (props) => {
  return (
    <div className="${componentName.toLowerCase()}">
      <h2>${componentName}</h2>
      {/* Add your component content here */}
    </div>
  );
};
`;
    } else {
      return `import React, { Component } from 'react';

interface ${componentName}Props {
  // Add your props here
}

interface ${componentName}State {
  // Add your state here
}

export class ${componentName} extends Component<${componentName}Props, ${componentName}State> {
  constructor(props: ${componentName}Props) {
    super(props);
    this.state = {
      // Initialize your state here
    };
  }

  render() {
    return (
      <div className="${componentName.toLowerCase()}">
        <h2>${componentName}</h2>
        {/* Add your component content here */}
      </div>
    );
  }
}
`;
    }
  }

  private generateTestContent(componentName: string): string {
    return `import React from 'react';
import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName} />);
    expect(screen.getByText('${componentName}')).toBeInTheDocument();
  });

  // Add more tests here
});
`;
  }

  private generateStoryContent(componentName: string): string {
    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from './${componentName}';

const meta: Meta<typeof ${componentName}> = {
  title: 'Components/${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Add default props here
  },
};
`;
  }

  private generateApiContent(endpointName: string, methods: string[], includeAuth: boolean): string {
    const authImport = includeAuth ? "import { supabase } from '@/lib/supabase';" : '';
    const authCheck = includeAuth ? `
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }
` : '';

    let methodImplementations = '';

    for (const method of methods) {
      switch (method.toUpperCase()) {
        case 'GET':
          methodImplementations += `
  // Get ${endpointName}
  async get${endpointName}(id?: string) {${authCheck}
    const { data, error } = await supabase
      .from('${endpointName.toLowerCase()}')
      \${id ? \`.eq('id', id).single()\` : \`.select('*')\`};

    if (error) throw error;
    return data;
  },
`;
          break;
        case 'POST':
          methodImplementations += `
  // Create ${endpointName}
  async create${endpointName}(data: any) {${authCheck}
    const { data: result, error } = await supabase
      .from('${endpointName.toLowerCase()}')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },
`;
          break;
        case 'PUT':
          methodImplementations += `
  // Update ${endpointName}
  async update${endpointName}(id: string, updates: any) {${authCheck}
    const { data, error } = await supabase
      .from('${endpointName.toLowerCase()}')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
`;
          break;
        case 'DELETE':
          methodImplementations += `
  // Delete ${endpointName}
  async delete${endpointName}(id: string) {${authCheck}
    const { error } = await supabase
      .from('${endpointName.toLowerCase()}')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
`;
          break;
      }
    }

    return `${authImport}

export const ${endpointName}Api = {${methodImplementations}
};
`;
  }

  private async updateApiIndex(endpointName: string): Promise<void> {
    const indexPath = join('src/lib/api', 'index.ts');
    
    try {
      let indexContent = '';
      try {
        indexContent = await fs.readFile(indexPath, 'utf-8');
      } catch {
        // File doesn't exist, create new
      }

      const exportLine = `export { ${endpointName}Api } from './${endpointName}';`;
      
      if (!indexContent.includes(exportLine)) {
        indexContent += `${exportLine}\n`;
        await fs.writeFile(indexPath, indexContent);
      }
    } catch (error) {
      console.warn('Could not update API index file:', error);
    }
  }
}
