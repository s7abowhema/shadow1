export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false });
    
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL required' });
    
    try {
        const apiUrl = `https://twitsave.com/api/ajaxSearch?q=${encodeURIComponent(url)}`;
        const response = await fetch(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/x-www-form-urlencoded' },
            method: 'POST',
            body: new URLSearchParams({ q: url })
        });
        
        const data = await response.json();
        
        if (data && data.medias) {
            const video = data.medias.find(m => m.type === 'video');
            return res.status(200).json({
                success: true,
                video_url: video?.url,
                thumbnail: data.thumbnail,
                image_urls: data.medias.filter(m => m.type === 'image').map(m => m.url)
            });
        }
        
        return res.status(200).json({ success: false, error: 'لا يوجد فيديو في هذا التغريدة' });
    } catch(err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}