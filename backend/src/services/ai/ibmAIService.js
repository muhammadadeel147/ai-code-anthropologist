const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');
const { ClaudeAPIError } = require('../../utils/errors');

/**
 * IBM AI Service (IBM Bob / watsonx.ai)
 * This service integrates with IBM's AI capabilities
 */
class IBMAIService {
  constructor() {
    this.apiKey = config.claudeApiKey; // Using same env var for now, rename to IBM_API_KEY in production
    this.baseUrl = config.ibm?.apiUrl || 'https://api.anthropic.com/v1'; // IBM endpoint
    this.model = config.claude.model;
    this.maxTokens = config.claude.maxTokens;
    this.temperature = config.claude.temperature;
  }

  /**
   * Send a prompt to IBM AI and get response
   */
  async sendPrompt(prompt, systemPrompt = null, options = {}) {
    try {
      const requestBody = {
        model: options.model || this.model,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      // Add system prompt if provided
      if (systemPrompt) {
        requestBody.system = systemPrompt;
      }

      logger.info('Sending prompt to IBM AI', {
        model: requestBody.model,
        promptLength: prompt.length,
      });

      const response = await axios.post(
        `${this.baseUrl}/messages`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: options.timeout || 300000, // 5 minutes default
        }
      );

      const content = response.data.content[0].text;
      
      logger.info('Received response from IBM AI', {
        responseLength: content.length,
        usage: response.data.usage,
      });

      return {
        content,
        usage: response.data.usage,
        model: response.data.model,
      };
    } catch (error) {
      logger.error('IBM AI API error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 429) {
        throw new ClaudeAPIError('Rate limit exceeded. Please try again later.');
      }

      if (error.response?.status === 401) {
        throw new ClaudeAPIError('Invalid API key. Please check your IBM AI credentials.');
      }

      throw new ClaudeAPIError(error.message);
    }
  }

  /**
   * Execute Prompt 1: Repository Analysis
   */
  async executePrompt1(repositoryData) {
    const { url, files, commits, branches } = repositoryData;

    const prompt = `
═══════════════════════════════════════════════════════════
PROMPT 1: Dynamic Repository Analysis
═══════════════════════════════════════════════════════════

REPOSITORY CONTEXT:
Repository URL: ${url}
Total Files: ${files.length}
Total Commits: ${commits.length}
Branches: ${branches.join(', ')}

YOUR TASK: Analyze this repository and extract architectural decisions, mystery code patterns, dependency maps, and code evolution timeline.

REPOSITORY FILES:
${files.slice(0, 50).map(f => `- ${f.relativePath} (${f.size} bytes)`).join('\n')}
${files.length > 50 ? `... and ${files.length - 50} more files` : ''}

RECENT COMMITS:
${commits.slice(0, 20).map(c => `- ${c.date}: ${c.message} (${c.author})`).join('\n')}
${commits.length > 20 ? `... and ${commits.length - 20} more commits` : ''}

IDENTIFY AND EXTRACT:

A) ARCHITECTURAL DECISIONS (Most Important)
   Look for commits/messages containing:
   - "choose", "decide", "select", "pick"
   - "migrate to", "switch from", "adopt", "implement"
   - "fix", "hotfix", "patch" (often reveal past incidents)
   - "refactor", "rewrite", "restructure"
   
   For each decision, extract:
   - Title (summarize the decision)
   - Date (from commit timestamp)
   - Author (commit author)
   - Problem being solved
   - Alternatives mentioned
   - Final decision made
   - Reasoning/justification
   - Related files (full paths)
   - Commit hash

B) MYSTERY CODE PATTERNS
   Find code that seems:
   - Overly complex with no explanation
   - Has weird workarounds
   - Contains "magic numbers" or strange constants
   - Has excessive error handling
   - Looks like it was written for a specific incident

C) DEPENDENCY MAP
   Identify:
   - Main modules/services
   - How they communicate
   - External dependencies
   - Critical pathways

D) CODE EVOLUTION TIMELINE
   Track major changes:
   - When was the project created?
   - Major version changes
   - Technology stack changes
   - Architecture overhauls

OUTPUT FORMAT:
Return a comprehensive JSON file with this exact structure:

{
  "repository_info": {
    "url": "${url}",
    "name": "...",
    "language": "...",
    "total_commits": ${commits.length},
    "date_created": "YYYY-MM-DD",
    "last_commit": "YYYY-MM-DD",
    "total_files": ${files.length}
  },
  "decisions": [
    {
      "id": "ADR-001",
      "title": "...",
      "date": "YYYY-MM-DD",
      "author": "...",
      "commit_hash": "...",
      "problem": "...",
      "alternatives": ["Option A", "Option B"],
      "decision": "...",
      "reasoning": "...",
      "consequences": {
        "positive": ["..."],
        "negative": ["..."],
        "neutral": ["..."]
      },
      "related_files": [
        {"path": "src/file.js", "lines": "45-89", "relevance": "core implementation"}
      ],
      "status": "active"
    }
  ],
  "mystery_code": [
    {
      "file": "src/something.js",
      "lines": "123-145",
      "snippet": "const x = 42;",
      "question": "Why does this exist?",
      "hypothesis": "Likely workaround for..."
    }
  ],
  "dependency_graph": {
    "modules": [
      {"name": "auth", "type": "service", "files": ["auth.js"]}
    ],
    "connections": [
      {"from": "api", "to": "auth", "type": "imports", "strength": "strong"}
    ]
  },
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "Project created",
      "commit_hash": "...",
      "description": "..."
    }
  ],
  "summary": {
    "total_decisions_found": 0,
    "most_impactful_decision": "ADR-XXX",
    "oldest_decision": "ADR-XXX",
    "repositories_age_days": 0,
    "complexity_score": "low|medium|high"
  }
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or explanations.
`;

    const systemPrompt = `You are Bob, an expert software architect and code archaeologist. You analyze codebases to extract architectural decisions and historical context. Always return valid JSON.`;

    const response = await this.sendPrompt(prompt, systemPrompt, {
      maxTokens: 8000,
      timeout: 600000, // 10 minutes for analysis
    });

    // Parse JSON response
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse Prompt 1 response:', error);
      throw new Error('Invalid JSON response from AI');
    }
  }

  /**
   * Execute Prompt 2: ADR Generation
   */
  async executePrompt2(analysisOutput, repositoryUrl) {
    const prompt = `
═══════════════════════════════════════════════════════════
PROMPT 2: ADR Generation (Dynamic)
═══════════════════════════════════════════════════════════

REPOSITORY CONTEXT:
Repository URL: ${repositoryUrl}
Analysis Data: ${JSON.stringify(analysisOutput, null, 2)}

YOUR TASK: Generate formal Architecture Decision Records (ADRs) in Markdown format for EACH decision found in the analysis.

For each decision in the "decisions" array, create an ADR following this EXACT template:

# ADR-{ID}: {Decision Title}

**Status:** {Accepted | Deprecated | Superseded}
**Date:** {YYYY-MM-DD}
**Authors:** {Author}
**Commit:** {commit_hash}
**Repository:** ${repositoryUrl}

---

## 📋 Context

{Problem description and situation}

**Problem Statement:**
{Clear 1-2 sentence problem description}

---

## 🔍 Decision Options Considered

| Option | Description | Pros | Cons | Why Rejected/Accepted |
|--------|-------------|------|------|----------------------|
{Fill table with alternatives}

---

## ✅ Decision Made

{Clear statement of what was chosen}

---

## 🧠 Reasoning

{Why was this chosen over alternatives?}

**Key Factors:**
1. {Factor 1}
2. {Factor 2}

---

## 📊 Consequences

### ✅ Positive Outcomes
- {Benefit 1}

### ⚠️ Negative Outcomes
- {Drawback 1}

---

## 💻 Related Code

| File | Lines | Purpose |
|------|-------|---------|
{List related files}

---

OUTPUT FORMAT:
Return a JSON array of ADR objects:

{
  "adrs": [
    {
      "id": "ADR-001",
      "filename": "ADR-001-decision-title.md",
      "content": "# ADR-001: Decision Title\\n\\n..."
    }
  ]
}

Generate ADRs for ALL decisions found. Return ONLY valid JSON.
`;

    const systemPrompt = `You are Bob, an expert technical writer specializing in Architecture Decision Records. Generate comprehensive, well-structured ADRs.`;

    const response = await this.sendPrompt(prompt, systemPrompt, {
      maxTokens: 8000,
      timeout: 600000,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse Prompt 2 response:', error);
      throw new Error('Invalid JSON response from AI');
    }
  }

  /**
   * Execute Prompt 3: Knowledge Graph Generation
   */
  async executePrompt3(analysisOutput, adrs, repositoryUrl) {
    const prompt = `
═══════════════════════════════════════════════════════════
PROMPT 3: Knowledge Graph (Dynamic)
═══════════════════════════════════════════════════════════

REPOSITORY CONTEXT:
Repository URL: ${repositoryUrl}
Analysis: ${JSON.stringify(analysisOutput.summary, null, 2)}
ADRs: ${adrs.length} generated

YOUR TASK: Build a knowledge graph connecting decisions, code files, dependencies, and risks.

Extract these relationships:
1. DECISION → DECISION (superseded_by, affects, depends_on)
2. DECISION → CODE (implemented_in, affects, documented_in)
3. CODE → CODE (imports, calls, depends_on)
4. RISK ALERTS (fragile areas, deprecated code, breaking changes)

OUTPUT FORMAT (JSON only):

{
  "graph_metadata": {
    "repository_url": "${repositoryUrl}",
    "total_nodes": 0,
    "total_edges": 0,
    "total_risks": 0,
    "generated_date": "YYYY-MM-DD"
  },
  "nodes": [
    {
      "id": "ADR-001",
      "type": "decision",
      "category": "architecture",
      "properties": {
        "title": "...",
        "status": "accepted",
        "complexity_score": 5,
        "impact_score": 8
      }
    }
  ],
  "relationships": [
    {
      "from": "ADR-001",
      "to": "FILE-lib-express-js",
      "type": "implemented_in",
      "strength": "strong"
    }
  ],
  "risk_alerts": [
    {
      "id": "RISK-001",
      "severity": "high",
      "type": "breaking_change",
      "title": "...",
      "description": "...",
      "affected_items": [],
      "mitigation": "..."
    }
  ],
  "clusters": [
    {
      "name": "Authentication System",
      "nodes": ["ADR-001", "FILE-auth-js"]
    }
  ]
}

Return ONLY valid JSON.
`;

    const systemPrompt = `You are Bob, an expert in software architecture visualization and dependency analysis. Create comprehensive knowledge graphs.`;

    const response = await this.sendPrompt(prompt, systemPrompt, {
      maxTokens: 8000,
      timeout: 600000,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse Prompt 3 response:', error);
      throw new Error('Invalid JSON response from AI');
    }
  }

  /**
   * Execute Prompt 4: Q&A Function Generation
   */
  async executePrompt4(analysisOutput, adrs, knowledgeGraph, repositoryUrl) {
    const prompt = `
═══════════════════════════════════════════════════════════
PROMPT 4: Q&A Function (Dynamic)
═══════════════════════════════════════════════════════════

REPOSITORY: ${repositoryUrl}

YOUR TASK: Create a Q&A answer generator that can answer questions about this codebase.

Available data:
- Analysis: ${JSON.stringify(analysisOutput.summary, null, 2)}
- ADRs: ${adrs.length} records
- Knowledge Graph: ${knowledgeGraph.graph_metadata.total_nodes} nodes

Create a function that takes a question and returns a structured answer.

OUTPUT FORMAT (JSON only):

{
  "qa_function": {
    "name": "answerCodebaseQuestion",
    "description": "Answers questions about the codebase",
    "example_questions": [
      "Why did we choose X?",
      "What breaks if I change Y?",
      "When was Z implemented?"
    ],
    "answer_template": {
      "question": "string",
      "intent_type": "DECISION_QUERY|CHANGE_IMPACT|CODE_EXPLANATION|HISTORICAL_QUERY",
      "confidence_score": 0.0,
      "direct_answer": {
        "summary": "string",
        "key_points": []
      },
      "historical_context": {},
      "technical_details": {},
      "related_decisions": [],
      "impact_of_changes": {},
      "sources": []
    }
  },
  "sample_answers": [
    {
      "question": "Why did we choose the main technology?",
      "answer": {
        "question": "...",
        "intent_type": "DECISION_QUERY",
        "confidence_score": 0.9,
        "direct_answer": {
          "summary": "...",
          "key_points": ["..."]
        },
        "sources": [{"type": "ADR", "id": "ADR-001"}]
      }
    }
  ]
}

Return ONLY valid JSON.
`;

    const systemPrompt = `You are Bob, an expert in natural language processing and code documentation. Create intelligent Q&A systems.`;

    const response = await this.sendPrompt(prompt, systemPrompt, {
      maxTokens: 8000,
      timeout: 600000,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse Prompt 4 response:', error);
      throw new Error('Invalid JSON response from AI');
    }
  }

  /**
   * Execute Prompt 5: System Testing
   */
  async executePrompt5(allOutputs, repositoryUrl) {
    const prompt = `
═══════════════════════════════════════════════════════════
PROMPT 5: Testing (Dynamic)
═══════════════════════════════════════════════════════════

REPOSITORY: ${repositoryUrl}

You've completed:
✅ Prompt 1: Repository analysis
✅ Prompt 2: ADR generation (${allOutputs.adrs?.length || 0} ADRs)
✅ Prompt 3: Knowledge graph (${allOutputs.knowledgeGraph?.graph_metadata?.total_nodes || 0} nodes)
✅ Prompt 4: Q&A function

YOUR TASK: Test the complete system and generate a readiness report.

OUTPUT FORMAT (JSON only):

{
  "test_results": {
    "test_1_onboarding": {
      "name": "New Developer Onboarding",
      "status": "PASS|FAIL",
      "details": "..."
    },
    "test_2_change_impact": {
      "name": "Change Impact Analysis",
      "status": "PASS|FAIL",
      "details": "..."
    },
    "test_3_mystery_code": {
      "name": "Mystery Code Explanation",
      "status": "PASS|FAIL",
      "details": "..."
    },
    "test_4_technology_decision": {
      "name": "Technology Decision Query",
      "status": "PASS|FAIL",
      "details": "..."
    },
    "test_5_unclear_question": {
      "name": "Unclear Question Handling",
      "status": "PASS|FAIL",
      "details": "..."
    }
  },
  "performance_metrics": {
    "accuracy_score": 0,
    "completeness_score": 0,
    "clarity_score": 0,
    "actionability_score": 0
  },
  "system_status": "READY_FOR_DEMO|NEEDS_IMPROVEMENT",
  "deliverables": {
    "analysis_output": true,
    "adrs_generated": ${allOutputs.adrs?.length || 0},
    "knowledge_graph": true,
    "qa_function": true
  },
  "known_issues": [],
  "recommendations": []
}

Return ONLY valid JSON.
`;

    const systemPrompt = `You are Bob, an expert QA engineer and system tester. Evaluate system readiness comprehensively.`;

    const response = await this.sendPrompt(prompt, systemPrompt, {
      maxTokens: 8000,
      timeout: 600000,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse Prompt 5 response:', error);
      throw new Error('Invalid JSON response from AI');
    }
  }
}

module.exports = new IBMAIService();

// Made with Bob
