/**
 * AI BIOMEDICAL ANALYZER
 * Frontend module for comprehensive biomedical image analysis
 */

class BiomedicalAnalyzer {
    constructor() {
        this.analysisResults = null;
        this.currentAnalysisId = null;
        this.isAnalyzing = false;
    }

    /**
     * Initialize the analyzer UI
     */
    async init() {
        this.setupEventListeners();
        await this.loadAnalysisHistory();
    }

    setupEventListeners() {
        // File upload listener
        const fileInput = document.getElementById('biomedical-image-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Analyze button
        const analyzeBtn = document.getElementById('analyze-biomedical-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.startAnalysis());
        }

        // Export PDF button
        const exportBtn = document.getElementById('export-pdf-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportPDF());
        }
    }

    /**
     * Handle file upload
     */
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
        if (!validTypes.includes(file.type)) {
            this.showError('Please upload an image (JPG, PNG) or video (MP4)');
            return;
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            this.showError('File size must be less than 50MB');
            return;
        }

        // Read and display file
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('biomedical-preview');
            if (preview) {
                if (file.type.startsWith('video/')) {
                    preview.innerHTML = `<video src="${e.target.result}" controls style="max-width:100%; border-radius:8px;"></video>`;
                } else {
                    preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%; border-radius:8px;">`;
                }
            }
            this.currentFile = file;
            this.currentFileData = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Start comprehensive biomedical analysis
     */
    async startAnalysis() {
        if (!this.currentFile) {
            this.showError('Please select an image or video first');
            return;
        }

        const query = document.getElementById('biomedical-query-input')?.value || 'biomedical analysis';
        
        if (!query.trim()) {
            this.showError('Please enter an analysis query');
            return;
        }

        this.isAnalyzing = true;
        this.showLoading('Analyzing image with multiple AI services...');

        try {
            // For demo purposes, use base64 data URL or upload to a server
            const analysisPayload = {
                imageUrl: this.currentFileData,
                query: query
            };

            const response = await fetch('/api/ai/biomedical-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(analysisPayload)
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            this.analysisResults = await response.json();
            this.displayAnalysisResults();
            this.showSuccess('Analysis complete!');

        } catch (error) {
            this.showError('Analysis failed: ' + error.message);
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * Display analysis results
     */
    displayAnalysisResults() {
        if (!this.analysisResults) return;

        const resultsContainer = document.getElementById('biomedical-results');
        if (!resultsContainer) return;

        const analyses = this.analysisResults.analyses || {};
        
        let html = `
            <div class="analysis-tabs">
                <button class="tab-btn active" data-tab="google-vision">Google Vision</button>
                <button class="tab-btn" data-tab="wikipedia">Wikipedia</button>
                <button class="tab-btn" data-tab="google-search">Google Search</button>
                <button class="tab-btn" data-tab="chatgpt">ChatGPT</button>
                <button class="tab-btn" data-tab="gemini">Gemini</button>
                <button class="tab-btn" data-tab="claude">Claude</button>
                <button class="tab-btn" data-tab="youtube">YouTube</button>
            </div>
        `;

        // Google Vision Results
        if (analyses.googleVision?.success) {
            html += `
                <div class="tab-content" data-tab="google-vision" style="display:block;">
                    <h3>Google Vision Analysis</h3>
                    ${analyses.googleVision.labels ? `
                        <div class="analysis-section">
                            <h4>Detected Labels</h4>
                            <div class="labels-grid">
                                ${analyses.googleVision.labels.map(label => `
                                    <span class="label-badge">${label.description} (${(label.score * 100).toFixed(1)}%)</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${analyses.googleVision.text ? `
                        <div class="analysis-section">
                            <h4>Extracted Text</h4>
                            <p>${analyses.googleVision.text}</p>
                        </div>
                    ` : ''}
                    ${analyses.googleVision.objects ? `
                        <div class="analysis-section">
                            <h4>Detected Objects</h4>
                            <ul>
                                ${analyses.googleVision.objects.map(obj => `
                                    <li>${obj.name} (${(obj.score * 100).toFixed(1)}%)</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Wikipedia Results
        if (analyses.wikipedia?.success) {
            html += `
                <div class="tab-content" data-tab="wikipedia">
                    <h3>Wikipedia References</h3>
                    ${analyses.wikipedia.results?.length > 0 ? `
                        <div class="results-list">
                            ${analyses.wikipedia.results.map(result => `
                                <div class="result-item">
                                    <h4>${result.title}</h4>
                                    <p>${result.snippet}</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No results found</p>'}
                </div>
            `;
        }

        // Google Search Results
        if (analyses.googleSearch?.success) {
            html += `
                <div class="tab-content" data-tab="google-search">
                    <h3>Google Search Results</h3>
                    ${analyses.googleSearch.results?.length > 0 ? `
                        <div class="results-list">
                            ${analyses.googleSearch.results.map(result => `
                                <div class="result-item">
                                    <h4><a href="${result.link}" target="_blank">${result.title}</a></h4>
                                    <p>${result.snippet}</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No results found</p>'}
                </div>
            `;
        }

        // ChatGPT Analysis
        if (analyses.chatgpt?.success) {
            html += `
                <div class="tab-content" data-tab="chatgpt">
                    <h3>ChatGPT Analysis</h3>
                    <div class="ai-response">
                        ${analyses.chatgpt.response}
                    </div>
                </div>
            `;
        }

        // Gemini Analysis
        if (analyses.gemini?.success) {
            html += `
                <div class="tab-content" data-tab="gemini">
                    <h3>Google Gemini Analysis</h3>
                    <div class="ai-response">
                        ${analyses.gemini.response}
                    </div>
                </div>
            `;
        }

        // Claude Analysis
        if (analyses.claude?.success) {
            html += `
                <div class="tab-content" data-tab="claude">
                    <h3>Claude Analysis</h3>
                    <div class="ai-response">
                        ${analyses.claude.response}
                    </div>
                </div>
            `;
        }

        // YouTube Results
        if (analyses.youtube?.success) {
            html += `
                <div class="tab-content" data-tab="youtube">
                    <h3>Related YouTube Videos</h3>
                    ${analyses.youtube.results?.length > 0 ? `
                        <div class="videos-grid">
                            ${analyses.youtube.results.map(video => `
                                <div class="video-card">
                                    <img src="${video.thumbnail}" alt="${video.title}">
                                    <h4><a href="${video.url}" target="_blank">${video.title}</a></h4>
                                    <p>${video.description.substring(0, 100)}...</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No videos found</p>'}
                </div>
            `;
        }

        resultsContainer.innerHTML = html;

        // Setup tab switching
        const tabButtons = resultsContainer.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const tabName = e.target.dataset.tab;
                resultsContainer.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = content.dataset.tab === tabName ? 'block' : 'none';
                });
            });
        });
    }

    /**
     * Export analysis to PDF
     */
    async exportPDF() {
        if (!this.analysisResults) {
            this.showError('No analysis to export. Please run analysis first.');
            return;
        }

        // Generate PDF using PDFKit (requires pdfkit on backend or browser-based PDF library)
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let yPosition = 10;

        // Title
        doc.setFontSize(16);
        doc.text('Biomedical Analysis Report', 10, yPosition);
        yPosition += 10;

        // Analysis details
        doc.setFontSize(12);
        doc.text(`Query: ${this.analysisResults.query}`, 10, yPosition);
        yPosition += 8;
        doc.text(`Date: ${new Date(this.analysisResults.timestamp).toLocaleString()}`, 10, yPosition);
        yPosition += 12;

        // Add results summary
        const analyses = this.analysisResults.analyses;

        if (analyses.googleVision?.success) {
            doc.setFontSize(12);
            doc.text('Google Vision Results:', 10, yPosition);
            yPosition += 8;
            if (analyses.googleVision.labels) {
                const labels = analyses.googleVision.labels.slice(0, 5);
                labels.forEach(label => {
                    doc.setFontSize(10);
                    doc.text(`• ${label.description} (${(label.score * 100).toFixed(1)}%)`, 15, yPosition);
                    yPosition += 6;
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 10;
                    }
                });
            }
            yPosition += 4;
        }

        if (analyses.chatgpt?.success) {
            doc.setFontSize(12);
            doc.text('ChatGPT Analysis:', 10, yPosition);
            yPosition += 8;
            const lines = doc.splitTextToSize(analyses.chatgpt.response, 180);
            lines.forEach(line => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 10;
                }
                doc.setFontSize(10);
                doc.text(line, 15, yPosition);
                yPosition += 5;
            });
        }

        // Save PDF
        doc.save(`biomedical-analysis-${Date.now()}.pdf`);
        this.showSuccess('PDF exported successfully!');
    }

    /**
     * Load user's analysis history
     */
    async loadAnalysisHistory() {
        try {
            const response = await fetch('/api/ai/analysis-history');
            if (response.ok) {
                const data = await response.json();
                this.displayAnalysisHistory(data.analyses);
            }
        } catch (error) {
            console.error('Failed to load analysis history:', error);
        }
    }

    /**
     * Display analysis history
     */
    displayAnalysisHistory(analyses) {
        const historyContainer = document.getElementById('analysis-history');
        if (!historyContainer) return;

        if (analyses.length === 0) {
            historyContainer.innerHTML = '<p>No previous analyses. Start by uploading an image!</p>';
            return;
        }

        const html = analyses.map(analysis => `
            <div class="history-item" onclick="biomedicalAnalyzer.viewAnalysis(${analysis.id})">
                <img src="${analysis.image_url}" alt="Analysis" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
                <div class="history-info">
                    <p><strong>${analysis.query_text}</strong></p>
                    <small>${new Date(analysis.created_at).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');

        historyContainer.innerHTML = html;
    }

    /**
     * View previous analysis
     */
    async viewAnalysis(analysisId) {
        try {
            const response = await fetch(`/api/ai/analysis/${analysisId}`);
            if (response.ok) {
                this.analysisResults = await response.json();
                this.displayAnalysisResults();
                document.querySelector('[data-tab="analysis-results"]')?.click();
            }
        } catch (error) {
            this.showError('Failed to load analysis details');
        }
    }

    /**
     * Utility: Show error message
     */
    showError(message) {
        const notify = document.getElementById('notification');
        if (notify) {
            notify.textContent = message;
            notify.className = 'notification error';
            notify.style.display = 'block';
            setTimeout(() => notify.style.display = 'none', 5000);
        }
    }

    /**
     * Utility: Show success message
     */
    showSuccess(message) {
        const notify = document.getElementById('notification');
        if (notify) {
            notify.textContent = message;
            notify.className = 'notification success';
            notify.style.display = 'block';
            setTimeout(() => notify.style.display = 'none', 5000);
        }
    }

    /**
     * Utility: Show loading message
     */
    showLoading(message) {
        const notify = document.getElementById('notification');
        if (notify) {
            notify.textContent = message;
            notify.className = 'notification loading';
            notify.style.display = 'block';
        }
    }
}

// Initialize analyzer when document is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.biomedicalAnalyzer) {
        window.biomedicalAnalyzer = new BiomedicalAnalyzer();
        window.biomedicalAnalyzer.init();
    }
});
