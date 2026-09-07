export const compressImage = (fileOrDataUrl, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const processImage = (src) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(new Error('Failed to load image for compression.'));
            img.src = src;
        };

        if (typeof fileOrDataUrl === 'string') {
            processImage(fileOrDataUrl);
        } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => processImage(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(fileOrDataUrl);
        } else {
            reject(new Error('Invalid image input provided to compressImage.'));
        }
    });
};
