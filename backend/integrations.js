/**
 * External Integrations & AI Tools Database
 * Includes Google, Wikipedia, YouTube, LinkedIn, AI Tools, and Company Websites
 */

// ==================== AI TOOLS DATABASE ====================
const AI_TOOLS = {
  generative: [
    { name: "ChatGPT", url: "https://chat.openai.com", icon: "🤖", category: "Text Generation" },
    { name: "Google Gemini", url: "https://gemini.google.com", icon: "✨", category: "Text Generation" },
    { name: "Claude (Anthropic)", url: "https://claude.ai", icon: "🧠", category: "Text Generation" },
    { name: "Microsoft Copilot", url: "https://copilot.microsoft.com", icon: "💻", category: "Text Generation" },
  ],
  coding: [
    { name: "GitHub Copilot", url: "https://github.com/features/copilot", icon: "🔧", category: "Code Generation" },
    { name: "Tabnine", url: "https://www.tabnine.com", icon: "⚡", category: "Code Completion" },
    { name: "Code2Prompt", url: "https://code2prompt.com", icon: "📝", category: "Code Documentation" },
    { name: "Codeium", url: "https://codeium.com", icon: "🚀", category: "Code Generation" },
  ],
  image: [
    { name: "DALL-E", url: "https://openai.com/dall-e-3", icon: "🎨", category: "Image Generation" },
    { name: "Midjourney", url: "https://www.midjourney.com", icon: "🖼️", category: "Image Generation" },
    { name: "Stable Diffusion", url: "https://stablediffusionweb.com", icon: "🌈", category: "Image Generation" },
    { name: "Adobe Firefly", url: "https://www.adobe.com/products/firefly.html", icon: "✏️", category: "Image Editing" },
  ],
  video: [
    { name: "Synthesia", url: "https://www.synthesia.io", icon: "🎬", category: "Video Generation" },
    { name: "RunwayML", url: "https://runwayml.com", icon: "🎥", category: "Video Generation" },
    { name: "D-ID", url: "https://www.d-id.com", icon: "👤", category: "Avatar Generation" },
  ],
  data: [
    { name: "Tableau Public", url: "https://public.tableau.com", icon: "📊", category: "Data Visualization" },
    { name: "Power BI", url: "https://powerbi.microsoft.com", icon: "📈", category: "Business Intelligence" },
    { name: "Looker", url: "https://looker.com", icon: "🔍", category: "Data Analytics" },
  ],
};

// ==================== EXTERNAL SEARCH ENGINES ====================
const EXTERNAL_LINKS = {
  google: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  googleLens: (query) => `https://lens.google.com/search?q=${encodeURIComponent(query)}`,
  wikipedia: (query) => `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`,
  youtubeSearch: (query) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
  github: (query) => `https://github.com/search?q=${encodeURIComponent(query)}`,
  stackOverflow: (query) => `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
  linkedin: (query) => `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(query)}`,
};

// ==================== PROJECT ROADMAP DATABASE ====================
const PROJECT_DATABASE = {
  "Arduino Weather Station": {
    history: "Weather stations have evolved from mechanical instruments to digital IoT devices. Modern Arduino-based stations leverage sensor networks for real-time environmental monitoring.",
    category: "Hardware",
    difficulty: "Intermediate",
    roadmap: [
      { phase: "Phase 1: Planning", tasks: "Identify sensors, design circuit, gather components (2-3 days)" },
      { phase: "Phase 2: Sensor Integration", tasks: "Connect DHT22 (temp/humidity), BMP180 (pressure), connect to Arduino (3-4 days)" },
      { phase: "Phase 3: Data Collection", tasks: "Write Arduino sketches to read sensor data, calibrate readings (2-3 days)" },
      { phase: "Phase 4: Display & Storage", tasks: "Add LCD/OLED display, implement SD card logging (3-4 days)" },
      { phase: "Phase 5: IoT Cloud Sync", tasks: "Integrate WiFi module (ESP8266), send data to cloud (ThingSpeak, Blynk) (4-5 days)" },
      { phase: "Phase 6: Testing & Deployment", tasks: "Field testing, calibration, documentation (2-3 days)" }
    ],
    components: [
      "Arduino Uno/Mega",
      "DHT22 Temperature & Humidity Sensor",
      "BMP180 Barometric Pressure Sensor",
      "WiFi Module (ESP8266 or Shield)",
      "LCD 16x2 or OLED Display",
      "SD Card Module",
      "USB Cable",
      "Breadboard & Jumper Wires",
      "Power Supply (5V/USB)"
    ],
    codingLanguages: ["C/C++", "Arduino IDE"],
    codingStructure: [
      "Sensor initialization (setup())",
      "Data reading loop (loop())",
      "Data parsing and validation",
      "Display rendering",
      "WiFi communication",
      "Cloud API integration"
    ],
    softwareTools: ["Arduino IDE", "GitHub", "ThingSpeak", "Blynk", "PuTTY"],
    resources: [
      "Arduino Official Documentation",
      "YouTube tutorials on Arduino Sensors",
      "Sensor datasheets (DHT22, BMP180)"
    ]
  },
  "Smart Home Automation": {
    history: "Home automation evolved from simple timers to AI-powered systems that learn user behavior. Modern systems integrate IoT devices, voice assistants, and machine learning for personalized control.",
    category: "Software/Hardware",
    difficulty: "Advanced",
    roadmap: [
      { phase: "Phase 1: Architecture Design", tasks: "Design system architecture, choose platform (Home Assistant, SmartThings) (3-5 days)" },
      { phase: "Phase 2: IoT Device Integration", tasks: "Connect smart lights, locks, thermostats, sensors (5-7 days)" },
      { phase: "Phase 3: Backend Development", tasks: "Build central server/hub, database, API endpoints (5-7 days)" },
      { phase: "Phase 4: Mobile App Development", tasks: "Create iOS/Android app for remote control (7-10 days)" },
      { phase: "Phase 5: Voice Assistant Integration", tasks: "Add Alexa/Google Assistant compatibility (3-4 days)" },
      { phase: "Phase 6: AI & Automation Rules", tasks: "Implement machine learning for predictive automation (7-10 days)" },
      { phase: "Phase 7: Security & Testing", tasks: "Implement encryption, penetration testing, deployment (5-7 days)" }
    ],
    components: [
      "Raspberry Pi 4 / Docker Server",
      "Smart Lights (Philips Hue / LIFX)",
      "Smart Thermostat (Nest / Ecobee)",
      "Smart Locks (August / Yale)",
      "Motion Sensors",
      "Temperature/Humidity Sensors",
      "WiFi Router (with good range)",
      "Backup Power Supply"
    ],
    codingLanguages: ["Python", "JavaScript/Node.js", "React/Flutter"],
    codingStructure: [
      "Device driver layer",
      "Communication protocol (MQTT/Zigbee)",
      "Backend REST API",
      "Database models",
      "Frontend UI",
      "Authentication & Authorization",
      "ML prediction engine"
    ],
    softwareTools: ["Home Assistant", "Node-RED", "Python Flask/Django", "React Native", "PostgreSQL", "MQTT Broker", "Docker"],
    resources: [
      "Home Assistant Documentation",
      "IoT Development Courses",
      "Smart Home Forums"
    ]
  },
  "Machine Learning Image Classification": {
    history: "Image classification evolved from hand-crafted features to deep neural networks. Modern approaches use transfer learning and pre-trained models for state-of-the-art accuracy with minimal training data.",
    category: "Software",
    difficulty: "Advanced",
    roadmap: [
      { phase: "Phase 1: Problem Definition", tasks: "Define dataset, classes, success metrics (2-3 days)" },
      { phase: "Phase 2: Data Collection & Preprocessing", tasks: "Gather/clean 1000+ images, data augmentation (5-7 days)" },
      { phase: "Phase 3: Model Selection", tasks: "Research & compare models (CNN, ResNet, EfficientNet) (2-3 days)" },
      { phase: "Phase 4: Model Training", tasks: "Train on GPU, hyperparameter tuning, validation (7-10 days)" },
      { phase: "Phase 5: Evaluation & Optimization", tasks: "Test accuracy, precision, recall, optimize (3-5 days)" },
      { phase: "Phase 6: Deployment", tasks: "Convert to ONNX/TensorFlow Lite, API endpoint (3-4 days)" },
      { phase: "Phase 7: Monitoring", tasks: "Set up logging, performance monitoring, retraining schedule (2-3 days)" }
    ],
    components: [
      "GPU (NVIDIA Tesla/RTX)",
      "Dataset (ImageNet subset or custom)",
      "ML Libraries",
      "Compute Resources (Cloud or Local)"
    ],
    codingLanguages: ["Python", "CUDA/C++"],
    codingStructure: [
      "Data loading and preprocessing pipeline",
      "Model architecture definition",
      "Training loop with loss calculation",
      "Validation and testing functions",
      "Inference optimization",
      "API wrapper for predictions",
      "Monitoring and logging"
    ],
    softwareTools: ["TensorFlow/PyTorch", "Jupyter Notebook", "OpenCV", "Scikit-learn", "MLflow", "FastAPI", "AWS SageMaker"],
    resources: [
      "TensorFlow/PyTorch Documentation",
      "Fast.ai Courses",
      "Kaggle Datasets & Competitions"
    ]
  },
  "Full Stack E-commerce Platform": {
    history: "E-commerce evolved from static HTML catalogs to dynamic, personalized platforms with AI recommendations, social commerce, and omnichannel integration.",
    category: "Software",
    difficulty: "Advanced",
    roadmap: [
      { phase: "Phase 1: Requirements & Design", tasks: "Define features, user flows, database schema (3-5 days)" },
      { phase: "Phase 2: Backend Development", tasks: "Build API, authentication, product management (7-10 days)" },
      { phase: "Phase 3: Frontend Development", tasks: "Create responsive UI, product pages, cart (7-10 days)" },
      { phase: "Phase 4: Payment Integration", tasks: "Integrate Stripe/PayPal, order processing (3-5 days)" },
      { phase: "Phase 5: Admin Panel", tasks: "Build inventory, analytics, user management (5-7 days)" },
      { phase: "Phase 6: Search & Recommendations", tasks: "Implement Elasticsearch, AI recommendations (5-7 days)" },
      { phase: "Phase 7: Testing & Deployment", tasks: "QA, security audit, production deployment (5-7 days)" }
    ],
    components: [
      "Backend Server",
      "Database (PostgreSQL/MongoDB)",
      "Frontend Framework",
      "Payment Gateway",
      "CDN for Media",
      "Email Service"
    ],
    codingLanguages: ["JavaScript/TypeScript", "Python", "SQL"],
    codingStructure: [
      "User authentication & authorization",
      "Product catalog management",
      "Shopping cart logic",
      "Order processing",
      "Payment handling",
      "Recommendation engine",
      "Admin dashboard",
      "Search functionality",
      "Analytics"
    ],
    softwareTools: ["Node.js/Django", "React/Vue", "PostgreSQL", "Stripe", "Elasticsearch", "Redis", "Docker", "AWS/GCP"],
    resources: [
      "Ecommerce Tutorials",
      "Payment Gateway Documentation",
      "Web Development Courses"
    ]
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Search Wikipedia for comprehensive project information
 */
async function searchWikipedia(query) {
  try {
    const projectMatch = getProjectDetails(query);
    if (projectMatch && projectMatch.history) {
      return {
        title: query,
        snippet: projectMatch.history,
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`
      };
    }

    const searchTerms = [
      query,
      `${query} project`,
      `${query} technology`,
      `${query} engineering`
    ];

    for (const term of searchTerms) {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*`;
      const response = await fetch(url);
      const data = await response.json();
      const results = data?.query?.search || [];

      if (results.length === 0) continue;

      const normalizedQuery = term.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
      const bestResult = results.find(result => {
        const normalizedTitle = result.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        return normalizedTitle.includes(normalizedQuery) || normalizedQuery.split(' ').every(word => word.length < 3 || normalizedTitle.includes(word));
      }) || results[0];

      const pageTitle = bestResult.title;
      const summary = (bestResult.snippet || '').replace(/<[^>]*>/g, '');

      return {
        title: pageTitle,
        snippet: summary || `${query} is a technology and engineering topic with rich practical and learning value.`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`
      };
    }

    return null;
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return null;
  }
}

/**
 * Generate AI Tool Recommendations based on project type
 */
function getRecommendedAITools(projectType) {
  const recommendations = [];
  
  if (projectType.toLowerCase().includes('code') || projectType.toLowerCase().includes('software')) {
    recommendations.push(...AI_TOOLS.coding);
  }
  if (projectType.toLowerCase().includes('image') || projectType.toLowerCase().includes('visual')) {
    recommendations.push(...AI_TOOLS.image);
  }
  if (projectType.toLowerCase().includes('data') || projectType.toLowerCase().includes('analysis')) {
    recommendations.push(...AI_TOOLS.data);
  }
  if (projectType.toLowerCase().includes('video')) {
    recommendations.push(...AI_TOOLS.video);
  }
  
  recommendations.push(...AI_TOOLS.generative);
  return [...new Set(recommendations.map(t => JSON.stringify(t)))].map(t => JSON.parse(t)).slice(0, 5);
}

/**
 * Get external search links for a query
 */
function getExternalSearchLinks(query) {
  return {
    google: EXTERNAL_LINKS.google(query),
    googleLens: EXTERNAL_LINKS.googleLens(query),
    youtube: EXTERNAL_LINKS.youtubeSearch(query),
    github: EXTERNAL_LINKS.github(query),
    stackOverflow: EXTERNAL_LINKS.stackOverflow(query),
    linkedin: EXTERNAL_LINKS.linkedin(query)
  };
}

/**
 * Fetch detailed project information
 */
function getProjectDetails(projectName) {
  return PROJECT_DATABASE[projectName] || null;
}

/**
 * Get all AI tool categories
 */
function getAllAITools() {
  const allTools = [];
  Object.values(AI_TOOLS).forEach(category => {
    allTools.push(...category);
  });
  return allTools;
}

/**
 * Get all available projects
 */
function getAllProjects() {
  return Object.keys(PROJECT_DATABASE);
}
