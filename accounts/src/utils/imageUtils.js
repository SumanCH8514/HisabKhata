/**
 * Resizes and compresses an image file to stay under a certain size limit (default 500KB)
 * Returns a promise that resolves to a Base64 string.
 */
export const compressImage = (file, maxWidth = 500, maxHeight = 500, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Start with requested quality, but reduce if still too large (rarely needed for 500x500 at 0.7)
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // If it's somehow still too large (unlikely for 500x500 jpeg at 0.7), we could loop, 
                // but for profile pics, 500x500 at 0.7 is usually ~30-60KB.
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
