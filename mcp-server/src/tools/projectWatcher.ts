import { watch } from 'chokidar';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CodeQualityAnalyzer } from './codeQualityAnalyzer.js';

export class ProjectWatcher {
  private watcher: any = null;
  private codeQualityAnalyzer: CodeQualityAnalyzer;

  constructor() {
    this.codeQualityAnalyzer = new CodeQualityAnalyzer();
  }

  async startWatching(args: {
    watchPaths?: string[];
    autoFix?: boolean;
  }): Promise<any> {
    const { watchPaths = ['src/**/*.ts', 'src/**/*.tsx'], autoFix = false } = args;

    try {
      if (this.watcher) {
        this.watcher.close();
      }

      this.watcher = watch(watchPaths, {
        ignored: /node_modules/,
        persistent: true,
      });

      let changeCount = 0;

      this.watcher
        .on('change', async (path: string) => {
          changeCount++;
          console.log(`File changed: ${path}`);
          
          try {
            // Analyze the changed file
            const result = await this.codeQualityAnalyzer.analyzeCodeQuality({ filePath: path });
            
            if (autoFix) {
              await this.codeQualityAnalyzer.lintProject({ fix: true });
            }
            
            // Log issues if any
            if (result.content[0].text.includes('Issues')) {
              console.log(`Issues detected in ${path}`);
            }
          } catch (error) {
            console.error(`Error analyzing ${path}:`, error);
          }
        })
        .on('add', (path: string) => {
          console.log(`File added: ${path}`);
        })
        .on('unlink', (path: string) => {
          console.log(`File removed: ${path}`);
        });

      return {
        content: [
          {
            type: 'text',
            text: `🔍 Project watcher started!\n\nWatching paths: ${watchPaths.join(', ')}\nAuto-fix: ${autoFix ? 'Enabled' : 'Disabled'}\n\nThe watcher will monitor file changes and analyze code quality automatically.`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to start project watcher: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async healthCheck(args: { includeMetrics?: boolean }): Promise<any> {
    const { includeMetrics = true } = args;

    try {
      const healthReport = await this.generateHealthReport(includeMetrics);

      return {
        content: [
          {
            type: 'text',
            text: healthReport,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateHealthReport(includeMetrics: boolean): Promise<string> {
    let report = `# Project Health Check Report\n\n`;
    
    // Check package.json
    const packageHealth = await this.checkPackageHealth();
    report += `## Package Health\n${packageHealth}\n\n`;

    // Check TypeScript configuration
    const tsHealth = await this.checkTypeScriptHealth();
    report += `## TypeScript Configuration\n${tsHealth}\n\n`;

    // Check code quality
    const codeHealth = await this.checkCodeHealth();
    report += `## Code Quality\n${codeHealth}\n\n`;

    // Check security
    const securityHealth = await this.checkSecurityHealth();
    report += `## Security\n${securityHealth}\n\n`;

    if (includeMetrics) {
      const metrics = await this.calculateProjectMetrics();
      report += `## Project Metrics\n${metrics}\n\n`;
    }

    // Overall score
    const overallScore = await this.calculateOverallScore();
    report += `## Overall Health Score: ${overallScore}/100\n\n`;

    return report;
  }

  private async checkPackageHealth(): Promise<string> {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      const issues: string[] = [];

      // Check for outdated dependencies (simplified check)
      if (!packageJson.dependencies) {
        issues.push('❌ No dependencies found');
      }

      if (!packageJson.devDependencies) {
        issues.push('⚠️ No dev dependencies found');
      }

      // Check for security-related packages
      const securityPackages = ['helmet', 'cors', 'express-rate-limit'];
      const hasSecurityPackages = securityPackages.some(pkg => 
        packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]
      );

      if (!hasSecurityPackages) {
        issues.push('⚠️ Consider adding security-related packages');
      }

      // Check scripts
      const requiredScripts = ['build', 'test', 'lint'];
      const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);
      
      if (missingScripts.length > 0) {
        issues.push(`⚠️ Missing scripts: ${missingScripts.join(', ')}`);
      }

      return issues.length === 0 ? '✅ Package configuration looks good!' : issues.join('\n');
    } catch (error) {
      return '❌ Could not read package.json';
    }
  }

  private async checkTypeScriptHealth(): Promise<string> {
    try {
      const tsConfig = JSON.parse(await fs.readFile('tsconfig.json', 'utf-8'));
      const issues: string[] = [];

      // Check strict mode
      if (!tsConfig.compilerOptions?.strict) {
        issues.push('⚠️ TypeScript strict mode is not enabled');
      }

      // Check for important compiler options
      const recommendedOptions = {
        'noUnusedLocals': true,
        'noUnusedParameters': true,
        'noImplicitReturns': true,
        'noFallthroughCasesInSwitch': true,
      };

      for (const [option, value] of Object.entries(recommendedOptions)) {
        if (tsConfig.compilerOptions?.[option] !== value) {
          issues.push(`⚠️ Consider enabling ${option}`);
        }
      }

      return issues.length === 0 ? '✅ TypeScript configuration looks good!' : issues.join('\n');
    } catch (error) {
      return '❌ Could not read tsconfig.json';
    }
  }

  private async checkCodeHealth(): Promise<string> {
    try {
      // Run a quick lint check
      const lintResult = await this.codeQualityAnalyzer.lintProject({ fix: false });
      const lintText = lintResult.content[0].text;
      
      if (lintText.includes('No issues found')) {
        return '✅ No linting issues found!';
      } else {
        const errorMatch = lintText.match(/Errors: (\d+)/);
        const warningMatch = lintText.match(/Warnings: (\d+)/);
        
        const errors = errorMatch ? parseInt(errorMatch[1]) : 0;
        const warnings = warningMatch ? parseInt(warningMatch[1]) : 0;
        
        return `⚠️ Found ${errors} errors and ${warnings} warnings`;
      }
    } catch (error) {
      return '❌ Could not check code quality';
    }
  }

  private async checkSecurityHealth(): Promise<string> {
    const issues: string[] = [];

    try {
      // Check for .env files in git
      const gitignore = await fs.readFile('.gitignore', 'utf-8');
      if (!gitignore.includes('.env')) {
        issues.push('⚠️ .env files should be in .gitignore');
      }
    } catch {
      issues.push('⚠️ No .gitignore file found');
    }

    try {
      // Check for hardcoded secrets in common files
      const files = ['src/lib/supabase.ts', 'src/lib/config/constants.ts'];
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          if (/(?:password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/.test(content)) {
            issues.push(`⚠️ Potential hardcoded secrets in ${file}`);
          }
        } catch {
          // File doesn't exist, skip
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return issues.length === 0 ? '✅ No obvious security issues found!' : issues.join('\n');
  }

  private async calculateProjectMetrics(): Promise<string> {
    try {
      const files = await this.getProjectFiles();
      let totalLines = 0;
      let totalFiles = files.length;
      let totalSize = 0;

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const stats = await fs.stat(file);
          totalLines += content.split('\n').length;
          totalSize += stats.size;
        } catch {
          // Skip files that can't be read
        }
      }

      return `- Total files: ${totalFiles}\n- Total lines of code: ${totalLines}\n- Total size: ${Math.round(totalSize / 1024)}KB`;
    } catch (error) {
      return '❌ Could not calculate project metrics';
    }
  }

  private async getProjectFiles(): Promise<string[]> {
    const { glob } = await import('glob');
    return await glob('src/**/*.{ts,tsx,js,jsx}', { ignore: ['node_modules/**', 'dist/**'] });
  }

  private async calculateOverallScore(): Promise<number> {
    let score = 100;

    // Deduct points for various issues
    try {
      const lintResult = await this.codeQualityAnalyzer.lintProject({ fix: false });
      const lintText = lintResult.content[0].text;
      
      const errorMatch = lintText.match(/Errors: (\d+)/);
      const warningMatch = lintText.match(/Warnings: (\d+)/);
      
      const errors = errorMatch ? parseInt(errorMatch[1]) : 0;
      const warnings = warningMatch ? parseInt(warningMatch[1]) : 0;
      
      score -= errors * 5; // 5 points per error
      score -= warnings * 2; // 2 points per warning
    } catch {
      score -= 10; // Deduct points if we can't check
    }

    return Math.max(0, Math.min(100, score));
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
