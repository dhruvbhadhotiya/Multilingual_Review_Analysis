document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements for File Upload Interface
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultsContainer = document.getElementById('results');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const searchInput = document.getElementById('searchInput');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const exportBtn = document.getElementById('exportBtn');
    
    // State
    let currentFile = null;
    let analysisResults = null;
    let currentPage = 1;
    const itemsPerPage = 10;
    let filteredResults = [];
    
    // Initialize charts
    let sentimentChart = null;
    let sentimentDistributionChart = null;
    let sentimentTrendsChart = null;
    
    // Setup Event Listeners
    setupEventListeners();
    
    function setupEventListeners() {
        // Only setup listeners if elements exist
        if (dropZone) {
            // File drag and drop
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, highlight, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, unhighlight, false);
            });
            
            dropZone.addEventListener('drop', handleDrop, false);
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', handleFileSelect, false);
        }
        
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', analyzeReviews);
        }
        
        if (tabButtons) {
            tabButtons.forEach(button => {
                button.addEventListener('click', () => switchTab(button.dataset.tab));
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', filterResults);
        }
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', goToPrevPage);
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', goToNextPage);
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', exportResults);
        }
    }
    
    // File Handling Functions
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropZone.classList.add('dragover');
    }
    
    function unhighlight() {
        dropZone.classList.remove('dragover');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }
    
    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (validateFile(file)) {
                currentFile = file;
                updateFileInfo(file);
                if (analyzeBtn) {
                    analyzeBtn.disabled = false;
                }
            }
        }
    }
    
    function validateFile(file) {
        const validTypes = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            showError('Please upload a valid CSV or text file');
            return false;
        }
        
        if (file.size > maxSize) {
            showError('File size exceeds 10MB limit');
            return false;
        }
        
        return true;
    }
    
    function updateFileInfo(file) {
        const fileSize = (file.size / (1024 * 1024)).toFixed(2); // Convert to MB
        
        if (fileInfo) {
            fileInfo.innerHTML = `
                <div class="file-details">
                    <i class="fas fa-file-alt file-icon"></i>
                    <div>
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${fileSize} MB</div>
                    </div>
                </div>
                <button class="remove-file" id="removeFile">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            fileInfo.classList.add('show');
            
            // Add event listener for remove button
            const removeBtn = document.getElementById('removeFile');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    currentFile = null;
                    if (fileInput) fileInput.value = '';
                    fileInfo.classList.remove('show');
                    if (analyzeBtn) analyzeBtn.disabled = true;
                });
            }
        }
    }
    
    // Main Analysis Function
    async function analyzeReviews() {
        if (!currentFile) {
            showError('Please select a file first');
            return;
        }
        
        showLoading('Uploading file...');
        
        try {
            // Use the backend API for file upload and analysis
            const formData = new FormData();
            formData.append('file', currentFile);
            
            console.log('Making request to /api/upload...');
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
            
            updateLoading('Processing file (this may take a few moments for large files)...');
            
            const response = await fetch('api/upload', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            updateLoading('Processing response...');
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.error('Expected JSON but got:', responseText);
                throw new Error('Server returned HTML instead of JSON. Check server logs.');
            }
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze reviews');
            }
            
            // Transform backend response to frontend format
            analysisResults = data.analysis_results.map(result => ({
                id: `review-${result.chunk_id + 1}`,
                text: result.original_text || result.text,
                processedText: result.processed_text,
                sentiment: result.sentiment,
                sentimentScore: result.sentiment_score,
                polarity: result.polarity,
                subjectivity: result.subjectivity,
                confidence: result.confidence,
                detectedLanguage: result.detected_language,
                wasTranslated: result.was_translated,
                rating: null, // Backend doesn't provide ratings for plain text
                date: new Date().toISOString().split('T')[0],
                topics: result.topics || result.advanced_analysis?.topics || [],
                keyPhrases: result.key_phrases || result.advanced_analysis?.key_phrases || []
            }));
            
            filteredResults = [...analysisResults];
            
            console.log('Analysis results:', analysisResults.length, 'items');
            console.log('Sample result:', analysisResults[0]);
            
            // Update UI with results
            updateResultsUI();
            
            console.log('UI update completed');
            
        } catch (error) {
            console.error('Error analyzing reviews:', error);
            
            // Show detailed error message
            let errorMessage = 'Failed to analyze reviews. ';
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out. The file might be too large or the server is busy. Please try again with a smaller file.';
            } else if (error.message.includes('Unexpected token')) {
                errorMessage += 'Server returned HTML instead of JSON. This usually means the API endpoint is not working correctly.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error. Please check your connection and ensure the server is running.';
            } else {
                errorMessage += error.message;
            }
            
            hideLoading();
            showError(errorMessage);
        } finally {
            // Reset UI state
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze Reviews';
        }
    }
    
    // UI Update Functions
    function updateResultsUI() {
        console.log('updateResultsUI called with', analysisResults?.length, 'results');
        
        // Remove loading overlay
        hideLoading();
        
        updateStats();
        updateCharts();
        updateTable();
        updateTopicCloud();
        switchTab('overview');
        console.log('All UI components updated');
    }
    
    function hideLoading() {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
    
    function updateStats() {
        console.log('updateStats called, analysisResults:', analysisResults?.length);
        if (!analysisResults || analysisResults.length === 0) {
            console.log('No analysis results to display');
            return;
        }
        
        const totalReviews = analysisResults.length;
        const totalRating = analysisResults.reduce((sum, review) => sum + (review.rating || 0), 0);
        const avgRating = totalRating > 0 ? (totalRating / analysisResults.length).toFixed(1) : 'N/A';
        
        // Calculate sentiment distribution
        const sentimentCounts = {
            positive: 0,
            neutral: 0,
            negative: 0
        };
        
        // Calculate average sentiment score
        let totalSentimentScore = 0;
        
        analysisResults.forEach(review => {
            const sentiment = review.sentiment?.toLowerCase() || 'neutral';
            if (sentimentCounts.hasOwnProperty(sentiment)) {
                sentimentCounts[sentiment]++;
            } else {
                sentimentCounts.neutral++;
            }
            
            totalSentimentScore += review.sentimentScore || 0.5;
        });
        
        const avgSentimentScore = totalSentimentScore / analysisResults.length;
        
        // Find dominant sentiment
        let dominantSentiment = 'neutral';
        let maxCount = 0;
        
        for (const [sentiment, count] of Object.entries(sentimentCounts)) {
            if (count > maxCount) {
                maxCount = count;
                dominantSentiment = sentiment;
            }
        }
        
        // Update DOM elements if they exist
        const totalReviewsEl = document.getElementById('total-reviews');
        const avgRatingEl = document.getElementById('avg-rating');
        const avgSentimentEl = document.getElementById('avg-sentiment');
        
        console.log('Updating DOM with:', {
            totalReviews,
            avgRating,
            dominantSentiment,
            avgSentimentScore,
            elementsFound: {
                totalReviewsEl: !!totalReviewsEl,
                avgRatingEl: !!avgRatingEl,
                avgSentimentEl: !!avgSentimentEl
            }
        });
        
        if (totalReviewsEl) totalReviewsEl.textContent = totalReviews;
        if (avgRatingEl) avgRatingEl.textContent = avgRating;
        if (avgSentimentEl) {
            avgSentimentEl.textContent = `${dominantSentiment.charAt(0).toUpperCase() + dominantSentiment.slice(1)} (${Math.round(avgSentimentScore * 100)}%)`;
            avgSentimentEl.className = 'stat-value sentiment-score ' + dominantSentiment;
        }
        
        // Update insights
        updateInsights(analysisResults, sentimentCounts);
    }
    
    function updateCharts() {
        updateSentimentDistributionChart();
        updateSentimentTrendsChart();
    }
    
    function updateSentimentDistributionChart() {
        const ctx = document.getElementById('sentimentDistributionChart');
        if (!ctx) return;
        
        // Group by sentiment
        const sentimentCounts = {
            positive: 0,
            neutral: 0,
            negative: 0
        };
        
        analysisResults.forEach(review => {
            const sentiment = review.sentiment?.toLowerCase() || 'neutral';
            if (sentimentCounts.hasOwnProperty(sentiment)) {
                sentimentCounts[sentiment]++;
            } else {
                sentimentCounts.neutral++;
            }
        });
        
        // Destroy previous chart if it exists
        if (sentimentDistributionChart) {
            sentimentDistributionChart.destroy();
        }
        
        sentimentDistributionChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [{
                    data: [
                        sentimentCounts.positive,
                        sentimentCounts.neutral,
                        sentimentCounts.negative
                    ],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function updateSentimentTrendsChart() {
        const ctx = document.getElementById('sentimentTrendsChart');
        if (!ctx) return;
        
        // Group by date and calculate average sentiment
        const dateMap = new Map();
        
        analysisResults.forEach(review => {
            const date = review.date || new Date().toISOString().split('T')[0];
            const sentimentScore = review.sentimentScore || 0;
            
            if (!dateMap.has(date)) {
                dateMap.set(date, { sum: 0, count: 0 });
            }
            
            const dateData = dateMap.get(date);
            dateData.sum += sentimentScore;
            dateData.count++;
        });
        
        // Sort dates
        const sortedDates = Array.from(dateMap.keys()).sort();
        const avgScores = sortedDates.map(date => {
            const data = dateMap.get(date);
            return data.sum / data.count;
        });
        
        // Destroy previous chart if it exists
        if (sentimentTrendsChart) {
            sentimentTrendsChart.destroy();
        }
        
        sentimentTrendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Average Sentiment Score',
                    data: avgScores,
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        title: {
                            display: true,
                            text: 'Sentiment Score (0-1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }
    
    function updateTable() {
        const tbody = document.getElementById('reviewsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!filteredResults || filteredResults.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" class="text-center">No reviews found</td>`;
            tbody.appendChild(tr);
            return;
        }
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredResults.length);
        const paginatedResults = filteredResults.slice(startIndex, endIndex);
        
        // Update pagination controls
        updatePaginationControls();
        
        // Populate table rows
        paginatedResults.forEach(review => {
            const tr = document.createElement('tr');
            
            // Limit review text length for display
            const reviewText = review.text.length > 100 
                ? review.text.substring(0, 100) + '...' 
                : review.text;
            
            // Format topics
            const topics = Array.isArray(review.topics) 
                ? review.topics.slice(0, 3).map(t => `<span class="topic-tag">${t}</span>`).join(' ')
                : '';
            
            // Format date
            const date = review.date 
                ? new Date(review.date).toLocaleDateString() 
                : 'N/A';
            
            tr.innerHTML = `
                <td>${reviewText}</td>
                <td><span class="sentiment-badge ${review.sentiment?.toLowerCase() || 'neutral'}">
                    ${review.sentiment || 'Neutral'}
                </span></td>
                <td>${review.rating || 'N/A'}</td>
                <td>${date}</td>
                <td>${topics}</td>
            `;
            
            tbody.appendChild(tr);
        });
    }
    
    function updateTopicCloud() {
        const topicCloud = document.getElementById('topicCloud');
        if (!topicCloud) return;
        
        topicCloud.innerHTML = '';
        
        if (!analysisResults || analysisResults.length === 0) return;
        
        // Extract all topics from reviews
        const topicMap = new Map();
        
        analysisResults.forEach(review => {
            if (Array.isArray(review.topics)) {
                review.topics.forEach(topic => {
                    const normalizedTopic = topic.toLowerCase().trim();
                    if (normalizedTopic) {
                        topicMap.set(
                            normalizedTopic, 
                            (topicMap.get(normalizedTopic) || 0) + 1
                        );
                    }
                });
            }
        });
        
        // Convert to array and sort by frequency
        const sortedTopics = Array.from(topicMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20); // Top 20 topics
        
        // Find min and max for scaling
        const counts = sortedTopics.map(([_, count]) => count);
        const minCount = Math.min(...counts);
        const maxCount = Math.max(...counts);
        
        // Generate topic cloud
        sortedTopics.forEach(([topic, count]) => {
            // Scale font size based on frequency (between 12px and 32px)
            const scale = (count - minCount) / (maxCount - minCount || 1);
            const fontSize = 12 + (scale * 20);
            
            const topicElement = document.createElement('span');
            topicElement.className = 'topic-tag';
            topicElement.style.fontSize = `${fontSize}px`;
            topicElement.textContent = topic;
            topicElement.title = `${count} mentions`;
            
            // Add click handler to filter by topic
            topicElement.addEventListener('click', () => {
                filterByTopic(topic);
            });
            
            topicCloud.appendChild(topicElement);
        });
    }
    
    function updateInsights(reviews, sentimentCounts) {
        const insightsContainer = document.getElementById('insights-content');
        if (!insightsContainer) return;
        
        if (!reviews || reviews.length === 0) {
            insightsContainer.innerHTML = 'No insights available';
            return;
        }
        
        // Calculate some basic insights
        const totalReviews = reviews.length;
        const positivePercentage = Math.round((sentimentCounts.positive / totalReviews) * 100) || 0;
        const negativePercentage = Math.round((sentimentCounts.negative / totalReviews) * 100) || 0;
        const neutralPercentage = Math.round((sentimentCounts.neutral / totalReviews) * 100) || 0;
        
        // Find most common topics (simplified)
        const topicMap = new Map();
        reviews.forEach(review => {
            if (Array.isArray(review.topics)) {
                review.topics.forEach(topic => {
                    const normalizedTopic = topic.toLowerCase().trim();
                    if (normalizedTopic) {
                        topicMap.set(
                            normalizedTopic, 
                            (topicMap.get(normalizedTopic) || 0) + 1
                        );
                    }
                });
            }
        });
        
        const sortedTopics = Array.from(topicMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([topic]) => topic);
        
        // Generate insights HTML
        let insightsHTML = `
            <div class="insight">
                <p>• <strong>${positivePercentage}%</strong> of reviews are positive, while <strong>${negativePercentage}%</strong> are negative.</p>
            </div>
        `;
        
        if (sortedTopics.length > 0) {
            insightsHTML += `
                <div class="insight">
                    <p>• The most discussed topics are: <strong>${sortedTopics.join(', ')}</strong>.</p>
                </div>
            `;
        }
        
        // Add more insights based on your data
        if (reviews.some(r => r.rating)) {
            const ratings = reviews.map(r => r.rating).filter(Boolean);
            const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
            insightsHTML += `
                <div class="insight">
                    <p>• The average rating is <strong>${avgRating} out of 5</strong>.</p>
                </div>
            `;
        }
        
        // Add a call to action
        insightsHTML += `
            <div class="insight">
                <p>• Explore the <strong>Sentiment</strong> and <strong>Topics</strong> tabs for more detailed analysis.</p>
            </div>
        `;
        
        insightsContainer.innerHTML = insightsHTML;
    }
    
    // Tab Navigation
    function switchTab(tabId) {
        // Hide all tab contents
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        // Activate selected tab
        const selectedTab = document.getElementById(`${tabId}-tab`);
        const selectedButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        
        if (selectedTab && selectedButton) {
            selectedTab.classList.add('active');
            selectedButton.classList.add('active');
        }
    }
    
    // Search and Filter
    function filterResults() {
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase();
        
        if (!searchTerm) {
            filteredResults = [...analysisResults];
        } else {
            filteredResults = analysisResults.filter(review => 
                review.text.toLowerCase().includes(searchTerm) ||
                (review.topics && review.topics.some(topic => 
                    topic.toLowerCase().includes(searchTerm)
                ))
            );
        }
        
        // Reset to first page when filtering
        currentPage = 1;
        
        // Update table with filtered results
        updateTable();
    }
    
    function filterByTopic(topic) {
        if (!topic) {
            filteredResults = [...analysisResults];
        } else {
            filteredResults = analysisResults.filter(review => 
                review.topics && review.topics.some(t => 
                    t.toLowerCase() === topic.toLowerCase()
                )
            );
        }
        
        // Update search input
        if (searchInput) {
            searchInput.value = topic;
        }
        
        // Reset to first page
        currentPage = 1;
        
        // Update table and switch to raw data tab
        updateTable();
        switchTab('raw-data');
    }
    
    // Pagination
    function updatePaginationControls() {
        if (!filteredResults || !pageInfo) {
            if (prevPageBtn) prevPageBtn.disabled = true;
            if (nextPageBtn) nextPageBtn.disabled = true;
            if (pageInfo) pageInfo.textContent = 'Page 1';
            return;
        }
        
        const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
        
        if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
        
        if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
    
    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            updateTable();
        }
    }
    
    function goToNextPage() {
        const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateTable();
        }
    }
    
    // Export
    function exportResults() {
        if (!analysisResults || analysisResults.length === 0) {
            showError('No data to export');
            return;
        }
        
        // Convert to CSV
        const headers = ['ID', 'Text', 'Sentiment', 'Sentiment Score', 'Rating', 'Date', 'Topics', 'Key Phrases'];
        
        const csvContent = [
            headers.join(','),
            ...analysisResults.map(review => {
                return [
                    `"${review.id}"`,
                    `"${review.text.replace(/"/g, '""')}"`,
                    `"${review.sentiment || ''}"`,
                    review.sentimentScore || '',
                    review.rating || '',
                    `"${review.date || ''}"`,
                    `"${Array.isArray(review.topics) ? review.topics.join('; ') : ''}"`,
                    `"${Array.isArray(review.keyPhrases) ? review.keyPhrases.join('; ') : ''}"`
                ].join(',');
            })
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `review-analysis-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // UI Helpers
    function showLoading(message) {
        if (resultsContainer) {
            // Remove any existing loading overlay
            const existingOverlay = resultsContainer.querySelector('.loading-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            // Add loading overlay instead of replacing content
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            resultsContainer.appendChild(overlay);
        }
    }
    
    function updateLoading(message) {
        const loadingElement = document.querySelector('.loading-overlay .loading');
        if (loadingElement) {
            const p = loadingElement.querySelector('p');
            if (p) p.textContent = message;
        }
    }
    
    function showError(message) {
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <p><i class="fas fa-exclamation-circle"></i> ${message}</p>
                </div>
            `;
        }
    }
});
