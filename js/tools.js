// Global variables
let loaded = false;
let series = [];
let currentFrame = 0;
let totalFrames = 0;
let isPlaying = false;
let playbackInterval = null;
let playbackSpeed = 100; // milliseconds between frames
let element = null;
let activeTool = null;
let dicomMetadata = {};

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Cornerstone and tools
    initializeCornerstone();
    setupEventListeners();
    initializeTools();
});

function initializeCornerstone() {
    // Set up cornerstone external dependencies
    cornerstoneTools.external.Hammer = Hammer;
    cornerstoneTools.external.cornerstone = cornerstone;
    cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    
    // Initialize cornerstone tools
    cornerstoneTools.init({
        showSVGCursors: true,
        mouseEnabled: true,
        touchEnabled: true
    });
    
    // Enable the element for cornerstone
    element = document.getElementById('dicomImage');
    cornerstone.enable(element);
    
    // Set default status message
    updateStatus('Ready to load DICOM files');
}

function setupEventListeners() {
    // File upload handling
    document.getElementById('uploadBtn').addEventListener('click', function() {
        document.getElementById('dicomUpload').click();
    });
    
    document.getElementById('dicomUpload').addEventListener('change', handleFileUpload);
    
    // Tool buttons
    document.getElementById('wwwcTool').addEventListener('click', function() { activateTool('Wwwc'); });
    document.getElementById('zoomTool').addEventListener('click', function() { activateTool('Zoom'); });
    document.getElementById('panTool').addEventListener('click', function() { activateTool('Pan'); });
    document.getElementById('magnifyTool').addEventListener('click', function() { activateTool('Magnify'); });
    document.getElementById('invertTool').addEventListener('click', function() { handleInvert(); });
    document.getElementById('resetTool').addEventListener('click', function() { handleReset(); });
    document.getElementById('eraserTool').addEventListener('click', function() { activateTool('Eraser'); });
    
    // Annotation tools
    document.getElementById('lengthTool').addEventListener('click', function() { activateTool('Length'); });
    document.getElementById('angleTool').addEventListener('click', function() { activateTool('Angle'); });
    document.getElementById('probeTool').addEventListener('click', function() { activateTool('Probe'); });
    document.getElementById('ellipticalRoiTool').addEventListener('click', function() { activateTool('EllipticalRoi'); });
    document.getElementById('rectangleRoiTool').addEventListener('click', function() { activateTool('RectangleRoi'); });
    document.getElementById('freehandRoiTool').addEventListener('click', function() { activateTool('FreehandRoi'); });
    document.getElementById('arrowAnnotateTool').addEventListener('click', function() { activateTool('ArrowAnnotate'); });
    document.getElementById('bidirectionalTool').addEventListener('click', function() { activateTool('Bidirectional'); });
    
    // Playback control
    document.getElementById('playClip').addEventListener('click', togglePlayback);
    
    // Annotation dropdown toggle
    document.getElementById('annotationTools').addEventListener('click', function() {
        document.getElementById('annotationDropdown').classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    window.addEventListener('click', function(event) {
        if (!event.target.matches('.dropdown-toggle')) {
            const dropdowns = document.getElementsByClassName('dropdown-content');
            for (let i = 0; i < dropdowns.length; i++) {
                const openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    });
    
    // Frame slider
    document.getElementById('frameSlider').addEventListener('input', function() {
        if (loaded && totalFrames > 1) {
            currentFrame = parseInt(this.value);
            loadFrame(currentFrame);
        }
    });
    
    // Screenshot button
    document.getElementById('captureBtn').addEventListener('click', captureScreenshot);
    
    // Mouse wheel for frame navigation
    element.addEventListener('wheel', handleMouseWheel);
}

function initializeTools() {
    // Initialize all cornerstone tools
    cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
    cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
    cornerstoneTools.addTool(cornerstoneTools.PanTool);
    cornerstoneTools.addTool(cornerstoneTools.MagnifyTool);
    cornerstoneTools.addTool(cornerstoneTools.LengthTool);
    cornerstoneTools.addTool(cornerstoneTools.AngleTool);
    cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
    cornerstoneTools.addTool(cornerstoneTools.EllipticalRoiTool);
    cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);
    cornerstoneTools.addTool(cornerstoneTools.FreehandRoiTool);
    cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool);
    cornerstoneTools.addTool(cornerstoneTools.BidirectionalTool);
    cornerstoneTools.addTool(cornerstoneTools.EraserTool);
    
    // Add custom tools if needed
    // cornerstoneTools.addTool(MyCustomTool);
}

async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) {
        updateStatus('No files were selected');
        return;
    }
    
    updateStatus(`Loading ${files.length} file(s)...`);
    
    // Reset series and current state
    series = [];
    currentFrame = 0;
    
    try {
        // Process each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
            series.push({
                imageId: imageId,
                fileName: file.name
            });
        }
        
        // Load the first image
        if (series.length > 0) {
            await loadAndViewImage(series[0].imageId);
            updateSeriesList();
            updateStatus('DICOM file(s) loaded successfully');
        }
    } catch (error) {
        console.error('Error loading files:', error);
        updateStatus('Error loading DICOM files');
    }
}

async function loadAndViewImage(imageId) {
    try {
        updateStatus('Loading image...');
        
        const image = await cornerstone.loadImage(imageId);
        const viewport = cornerstone.getDefaultViewportForImage(element, image);
        
        // Adjust default viewport settings if needed
        viewport.voi.windowWidth = image.windowWidth || 400;
        viewport.voi.windowCenter = image.windowCenter || 200;
        
        cornerstone.displayImage(element, image, viewport);
        loaded = true;
        
        // Extract metadata
        extractMetadata(image);
        
        // Check if multi-frame
        totalFrames = parseInt(image.data.intString('x00280008')) || 1;
        if (totalFrames <= 0) totalFrames = 1;
        
        // Update UI
        document.getElementById('frameCount').textContent = `Total Frames: ${totalFrames}`;
        updateFrameInfo();
        
        if (totalFrames > 1) {
            populateFramesSidebar();
            setupFrameSlider();
        } else {
            document.getElementById('framesSidebar').style.display = 'none';
            document.getElementById('frameSlider').parentElement.style.display = 'none';
        }
        
        // Set default tool
        activateTool('Wwwc');
        
        updateStatus('Image loaded successfully');
        
        // Setup viewport event listeners
        element.addEventListener('cornerstoneimagerendered', onImageRendered);
        
        return image;
    } catch (error) {
        console.error('Error loading DICOM image:', error);
        updateStatus('Error loading DICOM image');
        throw error;
    }
}

function extractMetadata(image) {
    if (!image || !image.data) return;
    
    const metadata = {};
    
    // Extract common DICOM tags
    const commonTags = [
        { tag: 'x00100010', name: 'Patient Name' },
        { tag: 'x00100020', name: 'Patient ID' },
        { tag: 'x00100030', name: 'Patient Birth Date' },
        { tag: 'x00100040', name: 'Patient Sex' },
        { tag: 'x00080020', name: 'Study Date' },
        { tag: 'x00080030', name: 'Study Time' },
        { tag: 'x00080060', name: 'Modality' },
        { tag: 'x00080090', name: 'Referring Physician' },
        { tag: 'x00081030', name: 'Study Description' },
        { tag: 'x00181030', name: 'Protocol Name' }
    ];
    
    commonTags.forEach(item => {
        const value = image.data.string(item.tag);
        if (value) {
            metadata[item.name] = value;
        }
    });
    
    // Add image-specific metadata
    metadata['Image Width'] = image.width;
    metadata['Image Height'] = image.height;
    metadata['Bits Allocated'] = image.data.uint16('x00280100');
    metadata['Bits Stored'] = image.data.uint16('x00280101');
    metadata['High Bit'] = image.data.uint16('x00280102');
    metadata['Pixel Representation'] = image.data.uint16('x00280103');
    metadata['Window Center'] = image.windowCenter;
    metadata['Window Width'] = image.windowWidth;
    
    dicomMetadata = metadata;
    displayMetadata();
}

function displayMetadata() {
    const container = document.getElementById('dicomMetadata');
    container.innerHTML = '';
    
    for (const [key, value] of Object.entries(dicomMetadata)) {
        const row = document.createElement('div');
        row.className = 'metadata-row';
        
        const keyElement = document.createElement('span');
        keyElement.className = 'metadata-key';
        keyElement.textContent = key + ':';
        
        const valueElement = document.createElement('span');
        valueElement.className = 'metadata-value';
        valueElement.textContent = value;
        
        row.appendChild(keyElement);
        row.appendChild(valueElement);
        container.appendChild(row);
    }
}

function updateSeriesList() {
    const container = document.getElementById('stackWrapper');
    container.innerHTML = '';
    
    series.forEach((item, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'series-thumbnail';
        thumbnail.innerHTML = `<div class="thumbnail-wrapper"></div>
                               <div class="thumbnail-label">${item.fileName}</div>`;
        
        const thumbnailElement = thumbnail.querySelector('.thumbnail-wrapper');
        cornerstone.enable(thumbnailElement);
        
        cornerstone.loadImage(item.imageId).then(image => {
            const viewport = cornerstone.getDefaultViewportForImage(thumbnailElement, image);
            cornerstone.displayImage(thumbnailElement, image, viewport);
            cornerstone.resize(thumbnailElement);
        }).catch(error => {
            console.error('Error loading thumbnail:', error);
            thumbnailElement.innerHTML = '<div class="error-thumbnail">Error</div>';
        });
        
        thumbnail.addEventListener('click', () => {
            loadAndViewImage(item.imageId);
        });
        
        container.appendChild(thumbnail);
    });
}

async function populateFramesSidebar() {
    const sidebar = document.getElementById('framesSidebar');
    sidebar.innerHTML = '';
    sidebar.style.display = totalFrames > 1 ? 'none' : 'none'; //frame side none
    
    // Only add frames if we have a multi-frame image
    if (totalFrames <= 1) return;
    
    const baseImageId = series[0].imageId;
    
    for (let i = 0; i < totalFrames; i++) {
        const frameDiv = document.createElement('div');
        frameDiv.className = 'frame-item';
        frameDiv.dataset.frameIndex = i;
        
        const thumbnailCanvas = document.createElement('canvas');
        
        try {
            cornerstone.enable(thumbnailCanvas);
            const image = await cornerstone.loadImage(`${baseImageId}?frame=${i}`);
            const viewport = cornerstone.getDefaultViewportForImage(thumbnailCanvas, image);
            cornerstone.displayImage(thumbnailCanvas, image, viewport);
            cornerstone.resize(thumbnailCanvas, true);
        } catch (error) {
            console.error(`Error loading frame ${i} thumbnail:`, error);
            // Create a placeholder for failed thumbnails
            const ctx = thumbnailCanvas.getContext('2d');
            thumbnailCanvas.width = 100;
            thumbnailCanvas.height = 80;
            ctx.fillStyle = '#f44336';
            ctx.fillRect(0, 0, 100, 80);
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(`Frame ${i+1}`, 25, 45);
        }
        
        const frameLabel = document.createElement('span');
        frameLabel.textContent = `Frame ${i + 1}`;
        
        frameDiv.appendChild(thumbnailCanvas);
        frameDiv.appendChild(frameLabel);
        
        frameDiv.addEventListener('click', () => {
            currentFrame = i;
            loadFrame(currentFrame);
            updateFrameSlider();
        });
        
        sidebar.appendChild(frameDiv);
    }
}

function setupFrameSlider() {
    const slider = document.getElementById('frameSlider');
    slider.min = 0;
    slider.max = totalFrames - 1;
    slider.value = currentFrame;
    slider.parentElement.style.display = totalFrames > 1 ? 'flex' : 'none';
}

function updateFrameSlider() {
    const slider = document.getElementById('frameSlider');
    slider.value = currentFrame;
}

async function loadFrame(frameIndex) {
    if (!loaded || frameIndex < 0 || frameIndex >= totalFrames) return;
    
    try {
        const image = await cornerstone.loadImage(`${series[0].imageId}?frame=${frameIndex}`);
        const viewport = cornerstone.getViewport(element);
        cornerstone.displayImage(element, image, viewport);
        
        currentFrame = frameIndex;
        updateFrameInfo();
        highlightCurrentFrameThumbnail();
    } catch (error) {
        console.error('Error loading frame:', error);
        updateStatus(`Error loading frame ${frameIndex + 1}`);
    }
}

function highlightCurrentFrameThumbnail() {
    // Remove highlight from all thumbnails
    document.querySelectorAll('.frame-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add highlight to current thumbnail
    const currentThumbnail = document.querySelector(`.frame-item[data-frame-index="${currentFrame}"]`);
    if (currentThumbnail) {
        currentThumbnail.classList.add('active');
    }
}

function updateFrameInfo() {
    document.getElementById('bottomleft').textContent = `Frame ${currentFrame + 1}/${totalFrames}`;
    document.getElementById('frameCounter').textContent = `Frame: ${currentFrame + 1}/${totalFrames}`;
}

function activateTool(toolName) {
    // Deactivate all tools
    deactivateAllTools();
    
    // Update UI to show active tool
    document.querySelectorAll('.toolButton').forEach(button => {
        button.classList.remove('active');
    });
    
    // Find the button for this tool and mark it active
    const toolButtons = {
        'Wwwc': 'wwwcTool',
        'Zoom': 'zoomTool',
        'Pan': 'panTool',
        'Magnify': 'magnifyTool',
        'Length': 'lengthTool',
        'Angle': 'angleTool',
        'Probe': 'probeTool',
        'EllipticalRoi': 'ellipticalRoiTool',
        'RectangleRoi': 'rectangleRoiTool',
        'FreehandRoi': 'freehandRoiTool',
        'ArrowAnnotate': 'arrowAnnotateTool',
        'Bidirectional': 'bidirectionalTool',
        'Eraser': 'eraserTool'
    };
    
    const buttonId = toolButtons[toolName];
    if (buttonId) {
        document.getElementById(buttonId).classList.add('active');
    }
    
    // Activate the chosen tool
    if (loaded) {
        activeTool = toolName;
        cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
        updateStatus(`${toolName} tool activated`);
    }
}

function deactivateAllTools() {
    const tools = ['Wwwc', 'Zoom', 'Pan', 'Magnify', 'Length', 'Angle', 'Probe', 
                   'EllipticalRoi', 'RectangleRoi', 'FreehandRoi', 'ArrowAnnotate', 
                   'Bidirectional', 'Eraser'];
    
    tools.forEach(tool => {
        cornerstoneTools.setToolDisabled(tool);
    });
}

function handleInvert() {
    if (!loaded) return;
    
    const viewport = cornerstone.getViewport(element);
    viewport.invert = !viewport.invert;
    cornerstone.setViewport(element, viewport);
    updateStatus('Image colors inverted');
}

function handleReset() {
    if (!loaded) return;
    
    cornerstone.reset(element);
    updateStatus('Image reset to default');
}

function handleMouseWheel(event) {
    if (!loaded || totalFrames <= 1) return;
    
    event.preventDefault();
    
    // Calculate new frame based on wheel direction
    const delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
    let newFrame = currentFrame - delta;
    
    // Ensure we stay within bounds
    newFrame = Math.max(0, Math.min(totalFrames - 1, newFrame));
    
    if (newFrame !== currentFrame) {
        currentFrame = newFrame;
        loadFrame(currentFrame);
        updateFrameSlider();
    }
}

function togglePlayback() {
    if (!loaded || totalFrames <= 1) {
        updateStatus('Playback not available - single frame image');
        return;
    }
    
    isPlaying = !isPlaying;
    const playButton = document.getElementById('playClip');
    
    if (isPlaying) {
        playButton.innerHTML = '<i class="fas fa-pause"></i>';
        startPlayback();
        updateStatus('Cine playback started');
    } else {
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        stopPlayback();
        updateStatus('Cine playback stopped');
    }
}

function startPlayback() {
    if (playbackInterval) {
        clearInterval(playbackInterval);
    }
    
    playbackInterval = setInterval(() => {
        currentFrame = (currentFrame + 1) % totalFrames;
        loadFrame(currentFrame);
        updateFrameSlider();
    }, playbackSpeed);
}

function stopPlayback() {
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
}

function captureScreenshot() {
    if (!loaded) {
        updateStatus('No image loaded to capture');
        return;
    }
    
    try {
        const canvas = element.querySelector('canvas');
        if (!canvas) {
            throw new Error('Canvas not found');
        }
        
        // Create a downloadable image
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `dicom-screenshot-${new Date().toISOString().slice(0, 19)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        updateStatus('Screenshot captured');
    } catch (error) {
        console.error('Error capturing screenshot:', error);
        updateStatus('Error capturing screenshot');
    }
}

function onImageRendered(event) {
    const viewport = cornerstone.getViewport(element);
    
    // Update viewport information
    document.getElementById('bottomright1').textContent = 
        `WW/WC: ${Math.round(viewport.voi.windowWidth)} / ${Math.round(viewport.voi.windowCenter)}`;
    
    document.getElementById('bottomright2').textContent = 
        `Zoom: ${viewport.scale.toFixed(2)}x`;
}

function updateStatus(message) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    
    // Clear status after 5 seconds
    setTimeout(() => {
        if (statusElement.textContent === message) {
            statusElement.textContent = '';
        }
    }, 5000);
}

// Handle window resizing
window.addEventListener('resize', function() {
    if (loaded) {
        cornerstone.resize(element, true);
    }
});