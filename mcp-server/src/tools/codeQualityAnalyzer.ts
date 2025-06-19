import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { glob } from 'glob';
import { ESLint } from 'eslint';

interface CodeQualityResult {
  file: string;
  issues: Array<{
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    rule: string;
    fixable: boolean;
  }>;
  metrics: {
    complexity: number;
    maintainabilityIndex: number;
    linesOfCode: number;
    duplicateLines: number;
  };
  suggestions: string[];
}

export class CodeQualityAnalyzer {
  private eslint: ESLint;

  constructor() {
    this.eslint = new ESLint({
      baseConfig: {
        rules: {
          // Security rules
          'no-eval': 'error',
          'no-implied-eval': 'error',
          'no-new-func': 'error',

          // Maintainability rules
          'complexity': ['warn', { max: 10 }],
          'max-depth': ['warn', { max: 4 }],
          'no-duplicate-imports': 'error',
        },
      },
    });
  }

  async analyzeCodeQuality(args: { filePath?: string; rules?: string[] }): Promise<any> {
    const { filePath = 'src', rules } = args;
    
    try {
      const results: CodeQualityResult[] = [];
      const files = await this.getFilesToAnalyze(filePath);

      for (const file of files) {
        const result = await this.analyzeFile(file, rules);
        results.push(result);
      }

      const summary = this.generateSummary(results);

      return {
        content: [
          {
            type: 'text',
            text: this.formatAnalysisReport(results, summary),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Code quality analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async lintProject(args: { fix?: boolean }): Promise<any> {
    const { fix = false } = args;
    
    try {
      const files = await glob('src/**/*.{ts,tsx,js,jsx}', { ignore: ['node_modules/**', 'dist/**'] });
      const results = await this.eslint.lintFiles(files);

      if (fix) {
        await ESLint.outputFixes(results);
      }

      const errorCount = results.reduce((sum, result) => sum + result.errorCount, 0);
      const warningCount = results.reduce((sum, result) => sum + result.warningCount, 0);

      const report = this.formatLintReport(results, errorCount, warningCount, fix);

      return {
        content: [
          {
            type: 'text',
            text: report,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Project linting failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getFilesToAnalyze(filePath: string): Promise<string[]> {
    const stat = await fs.stat(filePath);
    
    if (stat.isFile()) {
      return [filePath];
    } else if (stat.isDirectory()) {
      return await glob(join(filePath, '**/*.{ts,tsx,js,jsx}'), { 
        ignore: ['node_modules/**', 'dist/**'] 
      });
    }
    
    return [];
  }

  private async analyzeFile(filePath: string, rules?: string[]): Promise<CodeQualityResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const [lintResults] = await this.eslint.lintText(content, { filePath });

    const issues = lintResults.messages.map(msg => ({
      line: msg.line,
      column: msg.column,
      severity: msg.severity === 2 ? 'error' as const : 'warning' as const,
      message: msg.message,
      rule: msg.ruleId || 'unknown',
      fixable: msg.fix !== undefined,
    }));

    const metrics = await this.calculateMetrics(content);
    const suggestions = this.generateSuggestions(issues, metrics);

    return {
      file: filePath,
      issues,
      metrics,
      suggestions,
    };
  }

  private async calculateMetrics(content: string) {
    const lines = content.split('\n');
    const linesOfCode = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
    
    // Simple complexity calculation (count of if, for, while, switch, catch)
    const complexityKeywords = /\b(if|for|while|switch|catch)\b/g;
    const complexity = (content.match(complexityKeywords) || []).length;
    
    // Simple maintainability index (higher is better)
    const maintainabilityIndex = Math.max(0, 100 - complexity * 2 - (linesOfCode / 10));
    
    // Simple duplicate detection
    const duplicateLines = this.findDuplicateLines(lines);

    return {
      complexity,
      maintainabilityIndex: Math.round(maintainabilityIndex),
      linesOfCode,
      duplicateLines,
    };
  }

  private findDuplicateLines(lines: string[]): number {
    const lineMap = new Map<string, number>();
    let duplicates = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && trimmed.length > 10) {
        const count = lineMap.get(trimmed) || 0;
        lineMap.set(trimmed, count + 1);
        if (count === 1) duplicates++;
      }
    }

    return duplicates;
  }

  private generateSuggestions(issues: any[], metrics: any): string[] {
    const suggestions: string[] = [];

    if (metrics.complexity > 10) {
      suggestions.push('Consider breaking down complex functions into smaller, more manageable pieces');
    }

    if (metrics.maintainabilityIndex < 70) {
      suggestions.push('Code maintainability is low. Consider refactoring to improve readability');
    }

    if (metrics.duplicateLines > 5) {
      suggestions.push('Detected duplicate code. Consider extracting common functionality into reusable functions');
    }

    const securityIssues = issues.filter(issue => 
      issue.rule.includes('security') || 
      ['no-eval', 'no-implied-eval', 'no-new-func'].includes(issue.rule)
    );
    
    if (securityIssues.length > 0) {
      suggestions.push('Security vulnerabilities detected. Review and fix immediately');
    }

    return suggestions;
  }

  private generateSummary(results: CodeQualityResult[]) {
    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    const totalErrors = results.reduce((sum, result) => 
      sum + result.issues.filter(issue => issue.severity === 'error').length, 0
    );
    const totalWarnings = results.reduce((sum, result) => 
      sum + result.issues.filter(issue => issue.severity === 'warning').length, 0
    );
    const avgComplexity = results.reduce((sum, result) => sum + result.metrics.complexity, 0) / results.length;
    const avgMaintainability = results.reduce((sum, result) => sum + result.metrics.maintainabilityIndex, 0) / results.length;

    return {
      filesAnalyzed: results.length,
      totalIssues,
      totalErrors,
      totalWarnings,
      avgComplexity: Math.round(avgComplexity),
      avgMaintainability: Math.round(avgMaintainability),
    };
  }

  private formatAnalysisReport(results: CodeQualityResult[], summary: any): string {
    let report = `# Code Quality Analysis Report\n\n`;
    
    report += `## Summary\n`;
    report += `- Files analyzed: ${summary.filesAnalyzed}\n`;
    report += `- Total issues: ${summary.totalIssues}\n`;
    report += `- Errors: ${summary.totalErrors}\n`;
    report += `- Warnings: ${summary.totalWarnings}\n`;
    report += `- Average complexity: ${summary.avgComplexity}\n`;
    report += `- Average maintainability: ${summary.avgMaintainability}%\n\n`;

    for (const result of results) {
      if (result.issues.length > 0 || result.suggestions.length > 0) {
        report += `## ${result.file}\n\n`;
        
        if (result.issues.length > 0) {
          report += `### Issues (${result.issues.length})\n`;
          for (const issue of result.issues) {
            report += `- Line ${issue.line}: ${issue.message} (${issue.rule})\n`;
          }
          report += '\n';
        }

        if (result.suggestions.length > 0) {
          report += `### Suggestions\n`;
          for (const suggestion of result.suggestions) {
            report += `- ${suggestion}\n`;
          }
          report += '\n';
        }
      }
    }

    return report;
  }

  private formatLintReport(results: any[], errorCount: number, warningCount: number, fixed: boolean): string {
    let report = `# ESLint Report\n\n`;
    
    report += `## Summary\n`;
    report += `- Files checked: ${results.length}\n`;
    report += `- Errors: ${errorCount}\n`;
    report += `- Warnings: ${warningCount}\n`;
    if (fixed) {
      report += `- Auto-fixed issues where possible\n`;
    }
    report += '\n';

    const problemFiles = results.filter(result => result.errorCount > 0 || result.warningCount > 0);
    
    if (problemFiles.length > 0) {
      report += `## Files with Issues\n\n`;
      for (const result of problemFiles) {
        report += `### ${result.filePath}\n`;
        report += `- Errors: ${result.errorCount}\n`;
        report += `- Warnings: ${result.warningCount}\n\n`;
        
        for (const message of result.messages) {
          const severity = message.severity === 2 ? 'ERROR' : 'WARN';
          report += `- Line ${message.line}:${message.column} [${severity}] ${message.message} (${message.ruleId})\n`;
        }
        report += '\n';
      }
    } else {
      report += `✅ No issues found!\n`;
    }

    return report;
  }
}
