// Matrix background effect
const bgCanvas = document.getElementById("bg-canvas");
const bgCtx = bgCanvas.getContext("2d");
let matrixRain = [];
const matrixChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";

// Initialize background canvas
function initBgCanvas() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;

    const fontSize = 16;
    const columns = bgCanvas.width / fontSize;

    matrixRain = [];
    for (let i = 0; i < columns; i++) {
        matrixRain[i] = 1;
    }

    bgAnimateMatrix();
}

// Background Matrix animation
function bgAnimateMatrix() {
    bgCtx.fillStyle = "rgba(0, 0, 0, 0.05)";
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    bgCtx.fillStyle = "#00FF41";
    bgCtx.font = "16px monospace";

    for (let i = 0; i < matrixRain.length; i++) {
        const text = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
        bgCtx.fillText(text, i * 16, matrixRain[i] * 16);

        if (matrixRain[i] * 16 > bgCanvas.height && Math.random() > 0.975) {
            matrixRain[i] = 0;
        }
        matrixRain[i]++;
    }

    setTimeout(() => requestAnimationFrame(bgAnimateMatrix), 50);
}

// Matrix portrait generator
const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const cameraBtn = document.getElementById("camera-btn");
const cameraFeed = document.getElementById("camera-feed");
const captureBtn = document.getElementById("capture-btn");
const originalImage = document.getElementById("original-image");
const matrixCanvas = document.getElementById("matrix-canvas");
const matrixCtx = matrixCanvas.getContext("2d");
const loading = document.getElementById("loading");
const controls = document.getElementById("controls");
const downloadContainer = document.getElementById("download-container");
const downloadBtn = document.getElementById("download-btn");

const densityInput = document.getElementById("density");
const rainSpeedInput = document.getElementById("rain-speed");
const brightnessInput = document.getElementById("brightness");

let imageData = null;
let imagePixels = [];
let portraitRain = [];
let isProcessing = false;
let mediaStream = null;

// Event listeners
uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", handleFileUpload);
cameraBtn.addEventListener("click", toggleCamera);
captureBtn.addEventListener("click", captureImage);

densityInput.addEventListener("input", updatePortrait);
rainSpeedInput.addEventListener("input", updatePortrait);
brightnessInput.addEventListener("input", updatePortrait);

downloadBtn.addEventListener("click", downloadImage);

window.addEventListener("resize", initBgCanvas);

// Initialize
initBgCanvas();

// Handle file upload
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.match("image.*")) {
        const reader = new FileReader();
        reader.onload = (event) => {
            processImage(event.target.result);
        };
        reader.readAsDataURL(file);
    }
}

// Toggle camera
function toggleCamera() {
    if (cameraFeed.style.display === "none") {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
                .getUserMedia({ video: true })
                .then((stream) => {
                    mediaStream = stream;
                    cameraFeed.srcObject = stream;
                    cameraFeed.play();
                    cameraFeed.style.display = "block";
                    captureBtn.style.display = "block";
                })
                .catch((error) => {
                    console.error("Camera error:", error);
                    alert("Could not access the camera. Please upload an image instead.");
                });
        } else {
            alert("Your browser does not support camera access. Please upload an image instead.");
        }
    } else {
        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            mediaStream = null;
        }
        cameraFeed.style.display = "none";
        captureBtn.style.display = "none";
    }
}

// Capture image from camera
function captureImage() {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cameraFeed.videoWidth;
    tempCanvas.height = cameraFeed.videoHeight;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(cameraFeed, 0, 0);

    processImage(tempCanvas.toDataURL("image/png"));

    // Turn off camera
    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
    }
    cameraFeed.style.display = "none";
    captureBtn.style.display = "none";
}

// Process the uploaded image
function processImage(dataUrl) {
    if (isProcessing) return;
    isProcessing = true;
    loading.style.display = "block";

    const img = new Image();
    img.onload = () => {
        // Set original image
        originalImage.src = dataUrl;
        originalImage.style.display = "block";

        // Calculate dimensions (max 400px width for better performance)
        const maxWidth = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
        }

        // Set canvas dimensions
        matrixCanvas.width = width;
        matrixCanvas.height = height;

        // Draw image to get pixel data
        matrixCtx.drawImage(img, 0, 0, width, height);
        imageData = matrixCtx.getImageData(0, 0, width, height);

        // Extract pixel brightness data
        imagePixels = [];
        for (let y = 0; y < height; y++) {
            imagePixels[y] = [];
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];

                // Calculate brightness (weighted RGB)
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                imagePixels[y][x] = brightness;
            }
        }

        // Initialize portrait rain
        initPortraitRain();

        // Show controls
        controls.style.display = "flex";
        downloadContainer.style.display = "block";

        // Hide loading
        loading.style.display = "none";
        isProcessing = false;

        // Start animation
        animatePortrait();
    };

    img.onerror = () => {
        alert("Error loading image. Please try another one.");
        loading.style.display = "none";
        isProcessing = false;
    };

    img.src = dataUrl;
}

// Initialize portrait rain
function initPortraitRain() {
    portraitRain = [];
    const density = parseInt(densityInput.value);
    const step = 11 - density; // 1-10 scale inverted for intuitive control

    for (let x = 0; x < matrixCanvas.width; x += step) {
        portraitRain[x] = [];
        for (let y = 0; y < matrixCanvas.height; y += step) {
            if (x < imagePixels[0].length && y < imagePixels.length) {
                const brightness = imagePixels[y][x];
                if (brightness > 0.1) {
                    // Only create drops for non-black areas
                    portraitRain[x][y] = {
                        x: x,
                        y: -Math.random() * 100, // Start above the canvas
                        targetY: y,
                        brightness: brightness,
                        char: matrixChars.charAt(Math.floor(Math.random() * matrixChars.length)),
                        speed: Math.random() * 2 + 1,
                        arrived: false,
                        blinkTimer: Math.floor(Math.random() * 30),
                    };
                }
            }
        }
    }
}

// Update portrait based on controls
function updatePortrait() {
    initPortraitRain();
}

// Animate the matrix portrait
function animatePortrait() {
    if (!imageData) return;

    // Clear canvas
    matrixCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
    matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

    const rainSpeed = parseInt(rainSpeedInput.value) / 5; // 1-10 scale converted to usable values
    const brightness = parseInt(brightnessInput.value) / 5; // 1-10 scale

    // Update and draw each rain drop
    for (let x in portraitRain) {
        for (let y in portraitRain[x]) {
            const drop = portraitRain[x][y];

            // Update position
            if (!drop.arrived) {
                drop.y += drop.speed * rainSpeed;
                if (drop.y >= drop.targetY) {
                    drop.y = drop.targetY;
                    drop.arrived = true;
                }
            }

            // Change character occasionally
            drop.blinkTimer--;
            if (drop.blinkTimer <= 0) {
                drop.char = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
                drop.blinkTimer = Math.floor(Math.random() * 30);
            }

            // Calculate alpha based on brightness
            const alpha = drop.brightness * brightness;

            // Draw character
            matrixCtx.font = "12px monospace";
            matrixCtx.fillStyle = `rgba(0, 255, 65, ${alpha})`;

            if (drop.arrived && Math.random() < 0.05) {
                // Add glow effect for some characters
                matrixCtx.shadowColor = "#00FF41";
                matrixCtx.shadowBlur = 10;
            } else {
                matrixCtx.shadowBlur = 0;
            }

            matrixCtx.fillText(drop.char, drop.x, drop.y);
            matrixCtx.shadowBlur = 0;
        }
    }

    // Continue animation
    requestAnimationFrame(animatePortrait);
}

// Download the generated image
function downloadImage() {
    if (!imageData) return;

    const link = document.createElement("a");
    link.download = "matrix-portrait.png";
    link.href = matrixCanvas.toDataURL("image/png");
    link.click();
}

document.addEventListener("DOMContentLoaded", function () {
    const quotes = [
        "Unfortunately, no one can be told what the Matrix is. You have to see it for yourself.",
        "I know Kung Fu.",
        "Show me.",
        "Dodge this.",
        "What are you waiting for? You're faster than this. Don't think you are, know you are.",
        "There is no spoon.",
        "Choice is an illusion created between those with power and those without.",
        "Neo, sooner or later you're going to realize just as I did that there's a difference between knowing the path and walking the path.",
        "What do you want? - I want the same thing you want. I want what everybody wants. - What? - To be free.",
        "Everything that has a beginning has an end.",
    ];

    const quoteElement = document.getElementById("randomQuote");

    if (quoteElement) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        quoteElement.textContent = quotes[randomIndex];
    } else {
        console.error('Element with ID "randomQuote" not found.');
    }
});
