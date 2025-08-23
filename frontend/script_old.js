document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputText = document.getElementById('inputText');
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
    const swapLangsBtn = document.getElementById('swapLangs');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const translateBtn = document.getElementById('translateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const charCount = document.querySelector('.char-count');
    const resultsContainer = document.getElementById('results');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
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
    
    // Event Listeners
    setupEventListeners();
    
    function setupEventListeners() {
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
        
        // File input change
        fileInput.addEventListener('change', handleFileSelect, false);
        
        // Analyze button
        analyzeBtn.addEventListener('click', analyzeReviews);
        
        // Tab switching
        tabButtons.forEach(button => {
            button.addEventListener('click', () => switchTab(button.dataset.tab));
        });
        
        // Search
        searchInput.addEventListener('input', filterResults);
        
        // Pagination
        prevPageBtn.addEventListener('click', goToPrevPage);
        nextPageBtn.addEventListener('click', goToNextPage);
        
        // Export
        exportBtn.addEventListener('click', exportResults);
        
        // Update character count
        inputText.addEventListener('input', () => {
            const count = inputText.value.length;
            charCount.textContent = `${count}/1000`;
        });

        // Swap languages
        swapLangsBtn.addEventListener('click', () => {
            if (sourceLang.value !== 'auto') {
                const temp = sourceLang.value;
                sourceLang.value = targetLang.value;
                targetLang.value = temp;
            }
        });

        // Clear input and results
        clearBtn.addEventListener('click', () => {
            inputText.value = '';
            charCount.textContent = '0/1000';
            showPlaceholder();
        });

        // Analyze sentiment
        analyzeBtn.addEventListener('click', async () => {
            const text = inputText.value.trim();
            if (!text) {
                showError('Please enter some text to analyze');
                return;
            }

            showLoading('Analyzing sentiment...');
            
            try {
                // Replace with actual API call
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        language: sourceLang.value === 'auto' ? null : sourceLang.value
                    })
                });

                const data = await response.json();
                
                if (response.ok) {
                    showSentimentResults(data);
                } else {
                    throw new Error(data.error || 'Failed to analyze sentiment');
                }
            } catch (error) {
                console.error('Error analyzing sentiment:', error);
                showError(error.message);
            }
        });

        // Translate text
        translateBtn.addEventListener('click', async () => {
            const text = inputText.value.trim();
            if (!text) {
                showError('Please enter some text to translate');
                return;
            }

            showLoading('Translating...');
            
            try {
                // Replace with actual API call
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        source_lang: sourceLang.value === 'auto' ? null : sourceLang.value,
                        target_lang: targetLang.value
                    })
                });

                const data = await response.json();
                
                if (response.ok) {
                    showTranslationResults(data);
                } else {
                    throw new Error(data.error || 'Translation failed');
                }
            } catch (error) {
                console.error('Error translating:', error);
                showError(error.message);
            }
        });
    }
    
    // File Handling
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
                analyzeBtn.disabled = false;
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
        document.getElementById('removeFile').addEventListener('click', () => {
            currentFile = null;
            fileInput.value = '';
            fileInfo.classList.remove('show');
            analyzeBtn.disabled = true;
        });
    }
    
    // Analysis Functions
    async function analyzeReviews() {
        if (!currentFile) {
            showError('Please select a file first');
            return;
        }
        
        showLoading('Analyzing reviews...');
        
        try {
            // Use the backend API for file upload and analysis
            const formData = new FormData();
            formData.append('file', currentFile);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze reviews');
            }
            
            // Transform backend response to frontend format
            analysisResults = data.analysis_results.map(result => ({
                id: `review-${result.chunk_id + 1}`,
                text: result.text,
                sentiment: result.sentiment || result.analysis.sentiment,
                sentimentScore: result.sentiment_score || result.analysis.score,
                rating: null, // Backend doesn't provide ratings for plain text
                date: new Date().toISOString().split('T')[0],
                topics: result.analysis.topics || [],
                keyPhrases: result.analysis.keyPhrases || []
            }));
            
            filteredResults = [...analysisResults];
            
            // Update UI with results
            updateResultsUI();
            
        } catch (error) {
            console.error('Error analyzing reviews:', error);
            showError('Failed to analyze reviews. Please try again.');
        }
    }
    
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }
    
    function parseCSV(csvText) {
        return new Promise((resolve, reject) => {
            // Use PapaParse to parse CSV
            if (typeof Papa !== 'undefined') {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        // Transform parsed data to our review format
                        const reviews = results.data.map((row, index) => ({
                            id: `review-${index + 1}`,
                            text: row.review || row.comment || row.text || '',
                            rating: row.rating ? parseFloat(row.rating) : null,
                            date: row.date || new Date().toISOString().split('T')[0],
                            // Add any additional fields from CSV
                            ...Object.entries(row)
                                .filter(([key]) => !['review', 'comment', 'text', 'rating', 'date'].includes(key.toLowerCase()))
                                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
                        }));
                        resolve(reviews);
                    },
                    error: (error) => {
                        reject(new Error('Failed to parse CSV file'));
                    }
                });
            } else {
                reject(new Error('CSV parser not available'));
            }
        });
    }
    
    // processChunk function removed - now using backend API directly
    
    // UI Update Functions
    function updateResultsUI() {
        // Update stats
        updateStats();
        
        // Update charts
        updateCharts();
        
        // Update table
        updateTable();
        
        // Update topic cloud
        updateTopicCloud();
        
        // Switch to overview tab
        switchTab('overview');
    }
    
    function updateStats() {
        if (!analysisResults || analysisResults.length === 0) return;
        
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
        
        // Update DOM
        document.getElementById('total-reviews').textContent = totalReviews;
        document.getElementById('avg-rating').textContent = avgRating;
        
        const sentimentElement = document.getElementById('avg-sentiment');
        sentimentElement.textContent = `${dominantSentiment.charAt(0).toUpperCase() + dominantSentiment.slice(1)} (${Math.round(avgSentimentScore * 100)}%)`;
        sentimentElement.className = 'stat-value sentiment-score ' + dominantSentiment;
        
        // Update insights
        updateInsights(analysisResults, sentimentCounts);
    }
    
    function updateCharts() {
        // Sentiment distribution chart (pie)
        updateSentimentDistributionChart();
        
        // Sentiment trends chart (line)
        updateSentimentTrendsChart();
    }
    
    function updateSentimentDistributionChart() {
        const ctx = document.getElementById('sentimentDistributionChart').getContext('2d');
        
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
        const ctx = document.getElementById('sentimentTrendsChart').getContext('2d');
        
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
        searchInput.value = topic;
        
        // Reset to first page
        currentPage = 1;
        
        // Update table and switch to raw data tab
        updateTable();
        switchTab('raw-data');
    }
    
    // Pagination
    function updatePaginationControls() {
        if (!filteredResults) {
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
            pageInfo.textContent = 'Page 1';
            return;
        }
        
        const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
        
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
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
        resultsContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }
    
    function updateLoading(message) {
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.querySelector('p').textContent = message;
        }
    }
    
    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="error-message">
                <p><i class="fas fa-exclamation-circle"></i> ${message}</p>
            </div>
        `;
    }
    
    // Utility Functions (for demo purposes)
    function getRandomSentiment() {
        const sentiments = ['Positive', 'Neutral', 'Negative'];
        return sentiments[Math.floor(Math.random() * sentiments.length)];
    }
    
    function getRandomScore() {
        return Math.round((Math.random() * 0.5 + 0.25) * 100) / 100; // Between 0.25 and 0.75
    }
    
    function getRandomTopics() {
        const topics = [
            'Customer Service', 'Product Quality', 'Delivery', 'Price', 'Packaging',
            'Ease of Use', 'Features', 'Performance', 'Design', 'Value for Money'
        ];
        
        const count = Math.floor(Math.random() * 3) + 1; // 1-3 topics
        const shuffled = [...topics].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    function getRandomKeyPhrases(text) {
        if (!text) return [];
        
        const words = text.split(' ').filter(word => word.length > 3);
        if (words.length < 3) return [];
        
        const count = Math.min(Math.floor(Math.random() * 3) + 1, words.length - 1);
        const phrases = [];
        
        for (let i = 0; i < count; i++) {
            const start = Math.floor(Math.random() * (words.length - 2));
            const phrase = words.slice(start, start + 2).join(' ');
            if (phrase.length > 5) {
                phrases.push(phrase);
            }
        }
        
        return [...new Set(phrases)]; // Remove duplicates
    }
    
    // Helper functions
    function showPlaceholder() {
        resultsContainer.innerHTML = `
            <div class="placeholder">
                <p>Your analysis results will appear here</p>
            </div>
        `;
    }

    function showSentimentResults(data) {
        const sentimentClass = data.sentiment.toLowerCase();
        const scorePercentage = Math.round(data.score * 100);
        
        resultsContainer.innerHTML = `
            <div class="sentiment-result">
                <div class="sentiment-header">
                    <h3>Sentiment Analysis</h3>
                    <span class="sentiment-score ${sentimentClass}">
                        ${data.sentiment} (${scorePercentage}%)
                    </span>
                </div>
                <div class="score-bar">
                    <div class="score-fill ${sentimentClass}" style="width: ${scorePercentage}%"></div>
                </div>
                <p>Language: ${data.language || 'Auto-detected'}</p>
                <p>Analysis: ${data.analysis || 'Basic sentiment analysis completed'}</p>
                
                ${data.translated_text ? `
                <div class="translation-result">
                    <h4>Translation (${data.target_lang})</h4>
                    <p>${data.translated_text}</p>
                </div>
                ` : ''}
            </div>
        `;
    }

    function showTranslationResults(data) {
        const sentimentDisplay = data.sentiment ? `
            <div class="sentiment-info">
                <h4>Sentiment Analysis</h4>
                <span class="sentiment-score ${data.sentiment.toLowerCase()}">
                    ${data.sentiment} (${Math.round((data.sentiment_score || data.confidence || 0.5) * 100)}%)
                </span>
            </div>
        ` : '';

        resultsContainer.innerHTML = `
            <div class="translation-result">
                <h3>Translation (${data.target_lang})</h3>
                <p>${data.translated_text}</p>
                <p class="translation-meta">Translated from ${data.source_lang || 'auto-detected language'}</p>
                
                ${sentimentDisplay}
                
                ${data.error ? `<div class="error-message"><p>${data.error}</p></div>` : ''}
            </div>
        `;
    }
});