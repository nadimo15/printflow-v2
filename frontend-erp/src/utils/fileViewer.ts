export const handleViewFile = async (e: React.MouseEvent, base64Url: string) => {
    e.preventDefault();
    if (!base64Url) return;

    if (!base64Url.startsWith('data:')) {
        window.open(base64Url, '_blank');
        return;
    }

    try {
        const res = await fetch(base64Url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Note: We don't revoke immediately because the new tab needs time to load it
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
        console.error("Failed to open file", error);
    }
};

export const handleDownloadFile = async (e: React.MouseEvent, base64Url: string, fileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!base64Url) return;

    if (!base64Url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = base64Url;
        a.download = fileName || 'download';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    try {
        const res = await fetch(base64Url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName || 'design-file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        console.error("Failed to download file", error);
    }
};
