import { promises as fs } from 'fs';
import { join } from 'path';

interface ReviewResult {
  file: string;
  score: number;
  issues: Array<{
    line: number;
    severity: 'critical' | 'major' | 'minor' | 'info';
    category: 'security' | 'performance' | 'maintainability' | 'accessibility' | 'best-practices';
    message: string;
    suggestion: string;
  }>;
  improvements: string[];
}

export class CodeReviewer {
  async reviewChanges(args: {
    filePaths?: string[];
    reviewType?: 'security' | 'performance' | 'maintainability' | 'all';
  }): Promise<any> {
    const { filePaths = ['src'], reviewType = 'all' } = args;

    try {
      const results: ReviewResult[] = [];

      for (const filePath of filePaths) {
        const result = await this.reviewFile(filePath, reviewType);
        results.push(result);
      }

      const summary = this.generateReviewSummary(results);

      return {
        content: [
          {
            type: 'text',
            text: this.formatReviewReport(results, summary),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Code review failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async suggestImprovements(args: {
    filePath?: string;
    focus?: 'performance' | 'security' | 'accessibility' | 'maintainability';
  }): Promise<any> {
    const { filePath = 'src', focus } = args;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const improvements = await this.analyzeForImprovements(content, focus);

      return {
        content: [
          {
            type: 'text',
            text: this.formatImprovementSuggestions(filePath, improvements),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Improvement analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async reviewFile(filePath: string, reviewType: string): Promise<ReviewResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const issues: ReviewResult['issues'] = [];
    const improvements: string[] = [];

    // Security review
    if (reviewType === 'all' || reviewType === 'security') {
      issues.push(...this.checkSecurity(lines));
    }

    // Performance review
    if (reviewType === 'all' || reviewType === 'performance') {
      issues.push(...this.checkPerformance(lines));
    }

    // Maintainability review
    if (reviewType === 'all' || reviewType === 'maintainability') {
      issues.push(...this.checkMaintainability(lines));
    }

    // Generate improvements
    improvements.push(...this.generateImprovements(content, issues));

    // Calculate score (0-100)
    const score = this.calculateScore(issues, lines.length);

    return {
      file: filePath,
      score,
      issues,
      improvements,
    };
  }

  private checkSecurity(lines: string[]): ReviewResult['issues'] {
    const issues: ReviewResult['issues'] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      // Check for dangerous functions
      if (trimmed.includes('eval(') || trimmed.includes('Function(')) {
        issues.push({
          line: lineNumber,
          severity: 'critical',
          category: 'security',
          message: 'Use of eval() or Function() constructor detected',
          suggestion: 'Avoid using eval() or Function() constructor. Use safer alternatives like JSON.parse() for data parsing.',
        });
      }

      // Check for innerHTML usage
      if (trimmed.includes('innerHTML') && !trimmed.includes('textContent')) {
        issues.push({
          line: lineNumber,
          severity: 'major',
          category: 'security',
          message: 'Direct innerHTML usage detected',
          suggestion: 'Consider using textContent or a sanitization library to prevent XSS attacks.',
        });
      }

      // Check for hardcoded secrets
      if (/(?:password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/.test(trimmed.toLowerCase())) {
        issues.push({
          line: lineNumber,
          severity: 'critical',
          category: 'security',
          message: 'Potential hardcoded secret detected',
          suggestion: 'Move secrets to environment variables or secure configuration.',
        });
      }

      // Check for SQL injection risks
      if (trimmed.includes('query') && trimmed.includes('+') && trimmed.includes('`')) {
        issues.push({
          line: lineNumber,
          severity: 'major',
          category: 'security',
          message: 'Potential SQL injection vulnerability',
          suggestion: 'Use parameterized queries or prepared statements.',
        });
      }
    });

    return issues;
  }

  private checkPerformance(lines: string[]): ReviewResult['issues'] {
    const issues: ReviewResult['issues'] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      // Check for inefficient loops
      if (trimmed.includes('for') && trimmed.includes('.length')) {
        issues.push({
          line: lineNumber,
          severity: 'minor',
          category: 'performance',
          message: 'Accessing .length in loop condition',
          suggestion: 'Cache array length in a variable to avoid repeated property access.',
        });
      }

      // Check for missing React.memo or useMemo
      if (trimmed.includes('const') && trimmed.includes('=') && trimmed.includes('(') && trimmed.includes('=>')) {
        if (!lines.slice(Math.max(0, index - 2), index + 3).some(l => l.includes('memo') || l.includes('useMemo'))) {
          issues.push({
            line: lineNumber,
            severity: 'minor',
            category: 'performance',
            message: 'Consider memoization for expensive computations',
            suggestion: 'Use React.memo, useMemo, or useCallback to optimize re-renders.',
          });
        }
      }

      // Check for inefficient array methods
      if (trimmed.includes('.find(') && trimmed.includes('.filter(')) {
        issues.push({
          line: lineNumber,
          severity: 'minor',
          category: 'performance',
          message: 'Chaining find() after filter() is inefficient',
          suggestion: 'Use find() directly or combine the conditions.',
        });
      }
    });

    return issues;
  }

  private checkMaintainability(lines: string[]): ReviewResult['issues'] {
    const issues: ReviewResult['issues'] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      // Check for long lines
      if (line.length > 120) {
        issues.push({
          line: lineNumber,
          severity: 'minor',
          category: 'maintainability',
          message: 'Line too long (>120 characters)',
          suggestion: 'Break long lines into multiple lines for better readability.',
        });
      }

      // Check for magic numbers
      if (/\b\d{2,}\b/.test(trimmed) && !trimmed.includes('//')) {
        issues.push({
          line: lineNumber,
          severity: 'minor',
          category: 'maintainability',
          message: 'Magic number detected',
          suggestion: 'Replace magic numbers with named constants.',
        });
      }

      // Check for TODO/FIXME comments
      if (trimmed.includes('TODO') || trimmed.includes('FIXME')) {
        issues.push({
          line: lineNumber,
          severity: 'info',
          category: 'maintainability',
          message: 'TODO/FIXME comment found',
          suggestion: 'Address TODO/FIXME comments or create proper tickets.',
        });
      }

      // Check for console.log
      if (trimmed.includes('console.log') && !trimmed.includes('//')) {
        issues.push({
          line: lineNumber,
          severity: 'minor',
          category: 'maintainability',
          message: 'Console.log statement found',
          suggestion: 'Remove console.log statements or use proper logging.',
        });
      }
    });

    return issues;
  }

  private generateImprovements(content: string, issues: ReviewResult['issues']): string[] {
    const improvements: string[] = [];

    // Count issue types
    const securityIssues = issues.filter(i => i.category === 'security').length;
    const performanceIssues = issues.filter(i => i.category === 'performance').length;
    const maintainabilityIssues = issues.filter(i => i.category === 'maintainability').length;

    if (securityIssues > 0) {
      improvements.push('🔒 Security: Review and fix security vulnerabilities immediately');
    }

    if (performanceIssues > 3) {
      improvements.push('⚡ Performance: Consider optimizing performance-critical sections');
    }

    if (maintainabilityIssues > 5) {
      improvements.push('🔧 Maintainability: Refactor code to improve readability and maintainability');
    }

    // Check for missing TypeScript types
    if (content.includes(': any') || content.includes('as any')) {
      improvements.push('📝 TypeScript: Add proper type definitions to improve type safety');
    }

    // Check for missing error handling
    if (content.includes('async') && !content.includes('try') && !content.includes('catch')) {
      improvements.push('🚨 Error Handling: Add proper error handling for async operations');
    }

    return improvements;
  }

  private calculateScore(issues: ReviewResult['issues'], lineCount: number): number {
    let score = 100;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'major':
          score -= 10;
          break;
        case 'minor':
          score -= 5;
          break;
        case 'info':
          score -= 1;
          break;
      }
    });

    // Bonus for good practices
    if (issues.length === 0) score += 10;
    if (lineCount < 100) score += 5; // Bonus for concise code

    return Math.max(0, Math.min(100, score));
  }

  private async analyzeForImprovements(content: string, focus?: string): Promise<string[]> {
    const improvements: string[] = [];

    if (!focus || focus === 'performance') {
      if (content.includes('useEffect') && !content.includes('dependency array')) {
        improvements.push('Add dependency arrays to useEffect hooks to prevent unnecessary re-renders');
      }
    }

    if (!focus || focus === 'security') {
      if (content.includes('dangerouslySetInnerHTML')) {
        improvements.push('Review dangerouslySetInnerHTML usage and ensure content is properly sanitized');
      }
    }

    if (!focus || focus === 'accessibility') {
      if (content.includes('<img') && !content.includes('alt=')) {
        improvements.push('Add alt attributes to images for better accessibility');
      }
    }

    if (!focus || focus === 'maintainability') {
      if (content.split('\n').length > 200) {
        improvements.push('Consider breaking large files into smaller, more focused modules');
      }
    }

    return improvements;
  }

  private generateReviewSummary(results: ReviewResult[]) {
    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    const avgScore = results.reduce((sum, result) => sum + result.score, 0) / results.length;
    const criticalIssues = results.reduce((sum, result) => 
      sum + result.issues.filter(issue => issue.severity === 'critical').length, 0
    );

    return {
      filesReviewed: results.length,
      totalIssues,
      criticalIssues,
      avgScore: Math.round(avgScore),
    };
  }

  private formatReviewReport(results: ReviewResult[], summary: any): string {
    let report = `# Code Review Report\n\n`;
    
    report += `## Summary\n`;
    report += `- Files reviewed: ${summary.filesReviewed}\n`;
    report += `- Total issues: ${summary.totalIssues}\n`;
    report += `- Critical issues: ${summary.criticalIssues}\n`;
    report += `- Average score: ${summary.avgScore}/100\n\n`;

    for (const result of results) {
      report += `## ${result.file} (Score: ${result.score}/100)\n\n`;
      
      if (result.issues.length > 0) {
        report += `### Issues (${result.issues.length})\n`;
        for (const issue of result.issues) {
          const emoji = issue.severity === 'critical' ? '🚨' : 
                       issue.severity === 'major' ? '⚠️' : 
                       issue.severity === 'minor' ? '💡' : 'ℹ️';
          report += `${emoji} **Line ${issue.line}** [${issue.severity.toUpperCase()}]: ${issue.message}\n`;
          report += `   💡 ${issue.suggestion}\n\n`;
        }
      }

      if (result.improvements.length > 0) {
        report += `### Improvement Suggestions\n`;
        for (const improvement of result.improvements) {
          report += `- ${improvement}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }

  private formatImprovementSuggestions(filePath: string, improvements: string[]): string {
    let report = `# Improvement Suggestions for ${filePath}\n\n`;
    
    if (improvements.length === 0) {
      report += `✅ No specific improvements identified. Code looks good!\n`;
    } else {
      for (const improvement of improvements) {
        report += `- ${improvement}\n`;
      }
    }

    return report;
  }
}
