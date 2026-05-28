export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false });
    
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL required' });
    
    try {
        const trackId = extractTrackId(url);
        if (!trackId) throw new Error('Invalid Spotify URL');
        
        const apiUrl = `https://spotify-downloader9.p.rapidapi.com/downloadTrack?id=${trackId}`;
        
        const response = await fetch(`https://spotify-down.com/api/ajaxSearch?q=${encodeURIComponent(url)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const data = await response.json();
        
        if (data && data.link) {
            return res.status(200).json({
                success: true,
                audio_url: data.link,
                thumbnail: data.thumbnail,
                title: data.title,
                artist: data.artist
            });
        }
        
        return res.status(200).json({ success: false, error: 'فشل تحميل الأغنية' });
    } catch(err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

function extractTrackId(url) {
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}