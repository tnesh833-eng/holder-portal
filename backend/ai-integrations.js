const axios = require('axios');
const vision = require('@google-cloud/vision');

/**
 * AI INTEGRATIONS MODULE
 * Handles Wikipedia, Google, YouTube, LinkedIn, and AI tool integrations
 */

class AIIntegrations {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.googleApiKey = process.env.GOOGLE_API_KEY;
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    this.claudeApiKey = process.env.CLAUDE_API_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
  }

  /**
   * WIKIPEDIA SEARCH
   * Searches Wikipedia for health/medical terms
   */
  async searchWikipedia(query) {
    try {
      const response = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          format: 'json',
          origin: '*'
        }
      });

      const results = response.data.query.search.map(item => ({
        title: item.title,
        snippet: item.snippet,
        pageid: item.pageid
      }));

      return {
        success: true,
        source: 'Wikipedia',
        results: results.slice(0, 5)
      };
    } catch (error) {
      console.error('Wikipedia search error:', error.message);
      return {
        success: false,
        source: 'Wikipedia',
        error: error.message
      };
    }
  }

  /**
   * GOOGLE SEARCH
   * Search Google using Custom Search API
   */
  async searchGoogle(query) {
    try {
      if (!this.googleApiKey || !this.googleSearchEngineId) {
        return {
          success: false,
          source: 'Google Search',
          error: 'Google Search API not configured'
        };
      }

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          q: query,
          key: this.googleApiKey,
          cx: this.googleSearchEngineId
        }
      });

      const results = response.data.items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      }));

      return {
        success: true,
        source: 'Google Search',
        results: results.slice(0, 5)
      };
    } catch (error) {
      console.error('Google search error:', error.message);
      return {
        success: false,
        source: 'Google Search',
        error: error.message
      };
    }
  }

  /**
   * GOOGLE VISION API
   * Analyzes images for biomedical content
   */
  async analyzeImageWithGoogleVision(imageUrl) {
    try {
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return {
          success: false,
          source: 'Google Vision',
          error: 'Google Vision API credentials not configured'
        };
      }

      const client = new vision.ImageAnnotatorClient();

      const request = {
        image: { source: { imageUri: imageUrl } },
        features: [
          { type: 'LABEL_DETECTION' },
          { type: 'TEXT_DETECTION' },
          { type: 'OBJECT_LOCALIZATION' },
          { type: 'SAFE_SEARCH_DETECTION' }
        ]
      };

      const [result] = await client.annotateImage(request);

      return {
        success: true,
        source: 'Google Vision',
        labels: result.labelAnnotations,
        text: result.fullTextAnnotation?.text || 'No text found',
        objects: result.localizedObjectAnnotations,
        safeSearch: result.safeSearchAnnotation
      };
    } catch (error) {
      console.error('Google Vision error:', error.message);
      return {
        success: false,
        source: 'Google Vision',
        error: error.message
      };
    }
  }

  /**
   * CHATGPT (OpenAI)
   * Sends queries to ChatGPT for analysis
   */
  async queryChatGPT(userMessage, systemPrompt = '') {
    try {
      if (!this.openaiApiKey) {
        return {
          success: false,
          source: 'ChatGPT',
          error: 'OpenAI API key not configured'
        };
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt || 'You are a medical information assistant.' },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        source: 'ChatGPT',
        response: response.data.choices[0].message.content,
        model: 'gpt-4'
      };
    } catch (error) {
      console.error('ChatGPT error:', error.message);
      return {
        success: false,
        source: 'ChatGPT',
        error: error.message
      };
    }
  }

  /**
   * GOOGLE GEMINI
   * Sends queries to Google Gemini for analysis
   */
  async queryGemini(userMessage, systemPrompt = '') {
    try {
      if (!this.geminiApiKey) {
        return {
          success: false,
          source: 'Gemini',
          error: 'Gemini API key not configured'
        };
      }

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt ? systemPrompt + '\n\n' + userMessage : userMessage }
              ]
            }
          ]
        }
      );

      const text = response.data.candidates[0].content.parts[0].text;

      return {
        success: true,
        source: 'Gemini',
        response: text,
        model: 'gemini-pro'
      };
    } catch (error) {
      console.error('Gemini error:', error.message);
      return {
        success: false,
        source: 'Gemini',
        error: error.message
      };
    }
  }

  /**
   * CLAUDE (Anthropic)
   * Sends queries to Claude for analysis
   */
  async queryClaude(userMessage, systemPrompt = '') {
    try {
      if (!this.claudeApiKey) {
        return {
          success: false,
          source: 'Claude',
          error: 'Claude API key not configured'
        };
      }

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1024,
          system: systemPrompt || 'You are a medical information assistant.',
          messages: [
            { role: 'user', content: userMessage }
          ]
        },
        {
          headers: {
            'x-api-key': this.claudeApiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        source: 'Claude',
        response: response.data.content[0].text,
        model: 'claude-3-sonnet'
      };
    } catch (error) {
      console.error('Claude error:', error.message);
      return {
        success: false,
        source: 'Claude',
        error: error.message
      };
    }
  }

  /**
   * YOUTUBE SEARCH
   * Finds health-related videos
   */
  async searchYouTube(query) {
    try {
      if (!this.youtubeApiKey) {
        return {
          success: false,
          source: 'YouTube',
          error: 'YouTube API key not configured'
        };
      }

      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          q: query,
          type: 'video',
          part: 'snippet',
          maxResults: 5,
          key: this.youtubeApiKey
        }
      });

      const results = response.data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));

      return {
        success: true,
        source: 'YouTube',
        results: results
      };
    } catch (error) {
      console.error('YouTube search error:', error.message);
      return {
        success: false,
        source: 'YouTube',
        error: error.message
      };
    }
  }

  /**
   * LINKEDIN SEARCH
   * Finds health professionals
   * Note: LinkedIn doesn't have a direct search API, using web scraping alternative
   */
  async searchLinkedIn(query) {
    try {
      // LinkedIn API is restricted. Using a workaround with search query
      return {
        success: true,
        source: 'LinkedIn',
        message: 'Search LinkedIn for "' + query + '" professionals',
        searchUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query + ' health professional')}`,
        note: 'Direct LinkedIn API integration requires enterprise permissions'
      };
    } catch (error) {
      console.error('LinkedIn search error:', error.message);
      return {
        success: false,
        source: 'LinkedIn',
        error: error.message
      };
    }
  }

  /**
   * COMPREHENSIVE BIOMEDICAL ANALYSIS
   * Combines multiple AI sources and Google Vision
   */
  async comprehensiveBiomedicalAnalysis(imageUrl, userQuery) {
    const results = {
      timestamp: new Date().toISOString(),
      imageUrl: imageUrl,
      query: userQuery,
      analyses: {}
    };

    // Parallel requests to all AI services
    const [visionResult, wikipediaResult, googleResult, chatgptResult, geminiResult, claudeResult] = await Promise.all([
      this.analyzeImageWithGoogleVision(imageUrl),
      this.searchWikipedia(userQuery),
      this.searchGoogle(userQuery),
      this.queryChatGPT(`Analyze this biomedical image/query: ${userQuery}. Provide medical insights.`),
      this.queryGemini(`Analyze this biomedical image/query: ${userQuery}. Provide medical insights.`),
      this.queryClaude(`Analyze this biomedical image/query: ${userQuery}. Provide medical insights.`)
    ]);

    results.analyses.googleVision = visionResult;
    results.analyses.wikipedia = wikipediaResult;
    results.analyses.googleSearch = googleResult;
    results.analyses.chatgpt = chatgptResult;
    results.analyses.gemini = geminiResult;
    results.analyses.claude = claudeResult;

    return results;
  }
}

module.exports = new AIIntegrations();
