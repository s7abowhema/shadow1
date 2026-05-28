export default async function handler(req, res) {
    // إعدادات CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'الطريقة غير مدعومة' });
    }
    
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
    }
    
    try {
        // استخدام API مجاني لتحميل فيديوهات تيك توك
        const apiUrls = [
            `https://tikwm.com/api/?url=${encodeURIComponent(url)}`,
            `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`
        ];
        
        let data = null;
        let error = null;
        
        // محاولة جلب البيانات من API
        for (const apiUrl of apiUrls) {
            try {
                const response = await fetch(apiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result && result.code === 0) {
                        data = result.data;
                        break;
                    }
                }
            } catch (e) {
                error = e.message;
                continue;
            }
        }
        
        if (!data) {
            // API احتياطي آخر
            const fallbackApi = `https://api.tikmate.app/api/lookup?url=${encodeURIComponent(url)}`;
            try {
                const fbResponse = await fetch(fallbackApi);
                if (fbResponse.ok) {
                    const fbData = await fbResponse.json();
                    if (fbData && fbData.video_url) {
                        return res.status(200).json({
                            success: true,
                            video_url: fbData.video_url,
                            video_watermark: fbData.video_url,
                            thumbnail: fbData.thumbnail || '',
                            music_url: fbData.music_url || ''
                        });
                    }
                }
            } catch (fbError) {
                console.error('Fallback API error:', fbError);
            }
            
            return res.status(500).json({ 
                success: false, 
                error: 'تعذر تحميل الفيديو، تأكد من الرابط وحاول مرة أخرى' 
            });
        }
        
        // تنسيق البيانات للإرجاع
        const responseData = {
            success: true,
            video_url: data.play || data.video || '',
            video_watermark: data.wmplay || data.watermark || '',
            thumbnail: data.cover || data.thumbnail || '',
            music_url: data.music || '',
            title: data.title || '',
            author: data.author?.unique_id || ''
        };
        
        return res.status(200).json(responseData);
        
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'حدث خطأ في الخادم: ' + error.message 
        });
    }
}