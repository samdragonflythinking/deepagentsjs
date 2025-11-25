// Complete Dragonfly Lens Library - 35 Total Lenses
// Generated from folders 01-04 following Lens Creation Checklist
// Every lens includes MANDATORY constraint guidelines to prevent recursion loops

export const completeLensLibrary = [
  // ============================================================================
  // CORE STRATEGIC LENSES (4)
  // ============================================================================
  
  {
    name: "dragonfly-swot",
    description: "SWOT Analysis - Strengths, Weaknesses, Opportunities, Threats",
    category: "strategic",
  },
  
  {
    name: "dragonfly-pestle", 
    description: "PESTLE Analysis - Political, Economic, Social, Technological, Legal, Environmental factors",
    category: "strategic",
  },
  
  {
    name: "dragonfly-porter",
    description: "Porter's Five Forces - Competitive dynamics analysis",
    category: "strategic",
  },
  
  {
    name: "dragonfly-basic-stakeholder",
    description: "Basic Stakeholder Analysis - Key actors, interests, influence, and alignment",
    category: "stakeholder",
  },

  // ============================================================================
  // FOLDER 01: STAKEHOLDER ANALYSIS LENSES (7)
  // ============================================================================
  
  {
    name: "dragonfly-stakeholder-analysis",
    description: "Maps stakeholder power, interests, and influence revealing coalition opportunities and resistance points",
    category: "stakeholder",
  },
  
  {
    name: "dragonfly-expert-perspectives",
    description: "Analyzes through expert viewpoints - technical, practitioner, academic, and regulatory perspectives",
    category: "stakeholder",
  },
  
  {
    name: "dragonfly-social-demographic-perspectives",
    description: "Examines how social position and demographics shape different segments' views",
    category: "stakeholder",
  },
  
  {
    name: "dragonfly-political-perspectives",
    description: "Analyzes organized political actors through ideological frameworks",
    category: "stakeholder",
  },
  
  {
    name: "dragonfly-stakeholder-dynamics",
    description: "Coalition formation, conflict analysis, and relationship dynamics between stakeholders",
    category: "stakeholder",
  },
  
  {
    name: "dragonfly-stakeholder-engagement",
    description: "Prescriptive engagement strategy with communication, relationship-building, and coalition tactics",
    category: "stakeholder",
  },
  
  {
    name: "dragonfly-game-theory-analysis",
    description: "Applies game theory models to reveal optimal strategies in competitive environments",
    category: "stakeholder",
  },

  // ============================================================================
  // FOLDER 02: RISK ANALYSIS LENSES (7)
  // ============================================================================
  
  {
    name: "dragonfly-risk-reward-resilience",
    description: "RRR framework - Strategic balance across risk mitigation, reward capture, and resilience",
    category: "risk",
  },
  
  {
    name: "dragonfly-trends-uncertainties",
    description: "Scores drivers on Impact-Uncertainty-Velocity to prioritize trends and identify critical uncertainties",
    category: "risk",
  },
  
  {
    name: "dragonfly-pre-mortem",
    description: "Identifies failure pathways by imagining catastrophic failure and working backwards",
    category: "risk",
  },
  
  {
    name: "dragonfly-cognitive-bias",
    description: "Detects cognitive biases affecting decisions with debiasing interventions",
    category: "risk",
  },
  
  {
    name: "dragonfly-devils-advocate",
    description: "Systematically challenges assumptions and consensus views through rigorous opposition",
    category: "risk",
  },
  
  {
    name: "dragonfly-risk-mitigation",
    description: "Develops multi-layer defense strategies with early warning systems and resilience design",
    category: "risk",
  },
  
  {
    name: "dragonfly-red-team",
    description: "Simulates adversarial thinking to expose blind spots and test strategic resilience",
    category: "risk",
  },

  // ============================================================================
  // FOLDER 03: SYSTEMS ANALYSIS LENSES (9)
  // ============================================================================
  
  {
    name: "dragonfly-network-connections",
    description: "Examines how drivers interact through causal relationships and cascade effects",
    category: "systems",
  },
  
  {
    name: "dragonfly-feedback-loops-tipping-points",
    description: "Analyzes feedback loops and critical thresholds where systems shift dramatically",
    category: "systems",
  },
  
  {
    name: "dragonfly-emergence-self-organization",
    description: "Reveals how macro patterns emerge from micro-level interactions without central control",
    category: "systems",
  },
  
  {
    name: "dragonfly-synergies-trade-offs",
    description: "Examines how elements create compound value or constrain each other",
    category: "systems",
  },
  
  {
    name: "dragonfly-polarity-management",
    description: "Manages organizational tensions and paradoxes requiring dynamic balance",
    category: "systems",
  },
  
  {
    name: "dragonfly-dynamics-history",
    description: "Analyzes agent adaptation, learning, co-evolution, and historical path dependencies",
    category: "systems",
  },
  
  {
    name: "dragonfly-cynefin-framework",
    description: "Categorizes problems into domains (Clear/Complicated/Complex/Chaotic) for response strategies",
    category: "systems",
  },
  
  {
    name: "dragonfly-leverage-points",
    description: "Identifies high-impact intervention opportunities through Meadows' 12 Leverage Points",
    category: "systems",
  },
  
  {
    name: "dragonfly-interventions-effects",
    description: "Designs interventions and maps ripple effects through systems",
    category: "systems",
  },

  // ============================================================================
  // FOLDER 04: SCENARIO ANALYSIS LENSES (8)
  // ============================================================================
  
  {
    name: "dragonfly-scenario-charter",
    description: "Frames scenario engagement with force scan, uncertainty shortlist, and construction path",
    category: "scenario",
  },
  
  {
    name: "dragonfly-baseline-reference-scenario",
    description: "Projects most-likely future by extending evidenced trends and momentum drivers",
    category: "scenario",
  },
  
  {
    name: "dragonfly-four-scenarios",
    description: "2x2 scenario matrix using critical uncertainties to explore four distinct futures",
    category: "scenario",
  },
  
  {
    name: "dragonfly-multi-pathway-scenario",
    description: "Sequential pathway maps showing how decisions create divergent futures",
    category: "scenario",
  },
  
  {
    name: "dragonfly-backcasting-scenarios",
    description: "Works backward from desired/avoided states to build milestone pathways",
    category: "scenario",
  },
  
  {
    name: "dragonfly-scenario-stress-testing",
    description: "Tests strategic plans against plausible futures to identify vulnerabilities",
    category: "scenario",
  },
  
  {
    name: "dragonfly-wildcard-shock-scenarios",
    description: "Generates high-impact shock narratives with readiness checklists",
    category: "scenario",
  },
  
  {
    name: "dragonfly-scenario-signposts-trigger-points",
    description: "Builds indicator libraries and thresholds that signal when to activate responses",
    category: "scenario",
  }
];

// Helper function to generate orchestrator lens catalog
export function generateLensCatalog(): string {
  const categories = {
    strategic: completeLensLibrary.filter(l => l.category === 'strategic'),
    stakeholder: completeLensLibrary.filter(l => l.category === 'stakeholder'),
    risk: completeLensLibrary.filter(l => l.category === 'risk'),
    systems: completeLensLibrary.filter(l => l.category === 'systems'),
    scenario: completeLensLibrary.filter(l => l.category === 'scenario'),
  };

  return `
## Available Analytical Lenses (${completeLensLibrary.length} total)

You can invoke specialized analysis lenses using the task tool. Choose the most appropriate lenses based on the user's question.

### Core Strategic Analysis (${categories.strategic.length} lenses)
${categories.strategic.map((l, i) => `${i + 1}. **${l.name}**: ${l.description}`).join('\n')}

### Stakeholder & Political Analysis (${categories.stakeholder.length} lenses)
${categories.stakeholder.map((l, i) => `${i + 1}. **${l.name}**: ${l.description}`).join('\n')}

### Risk & Challenge Analysis (${categories.risk.length} lenses)
${categories.risk.map((l, i) => `${i + 1}. **${l.name}**: ${l.description}`).join('\n')}

### Systems Thinking Analysis (${categories.systems.length} lenses)
${categories.systems.map((l, i) => `${i + 1}. **${l.name}**: ${l.description}`).join('\n')}

### Scenario Planning Analysis (${categories.scenario.length} lenses)
${categories.scenario.map((l, i) => `${i + 1}. **${l.name}**: ${l.description}`).join('\n')}
`;
}
