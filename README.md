
# DICOM Viewer
A web-based DICOM image viewer with advanced visualization tools, created for educational purposes.

## Educational Purpose

This software is designed for educational use only to demonstrate DICOM file viewing and manipulation techniques. It is not intended for clinical use, medical diagnosis, or patient care.

## Features

- Load and view DICOM files
- Window/level adjustment
- Zoom, pan, and magnify tools
- Image inversion
- Annotation tools (length, angle, ROI measurements)
- Multiple ROI tools (elliptical, rectangular, freehand)
- Cine playback for multi-frame images
- Screenshot capture

## Technologies Used

- HTML5, CSS3, JavaScript
- jQuery
- Cornerstone.js library for DICOM rendering
- dicomParser for DICOM parsing
- cornerstoneTools for image manipulation tools

## Installation

1. Clone this repository
2. Open index.html in a web browser

## Usage

1. Click "Upload DICOM" to select a DICOM file
2. Use the toolbar to manipulate and analyze the image:
   - Window/Level: Adjust brightness and contrast
   - Zoom: Magnify regions of interest
   - Pan: Navigate around the image
   - Invert: Reverse image colors
   - Annotation tools: Measure distances, angles, and areas
3. For multi-frame DICOM files, use the playback controls
4. Capture screenshots as needed

## Project Structure

```
dicom-viewer/
├── index.html          # Main application page
├── logo.png            # Application logo
├── css/
│   └── styles.css      # Stylesheet for the application
└── js/
    ├── tools.js        # Custom tools implementation
    └── diacom/         # Third-party libraries
        ├── jquery-3.6.0.min.js
        ├── hammer.js
        ├── dicomParser.min.js
        ├── cornerstone.js
        ├── cornerstoneMath.min.js
        ├── cornerstoneWADOImageLoader.bundle.min.js
        └── cornerstoneTools.js
```


## Disclaimer

This software is provided for educational purposes only and is not intended for diagnostic use. It is provided as-is without any warranties or guarantees.
