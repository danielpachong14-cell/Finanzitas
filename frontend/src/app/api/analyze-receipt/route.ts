import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // --- FUTURE OPENAI INTEGRATION ARCHITECTURE --- //
        // 
        // 1. Install OpenAI SDK: `npm install openai`
        // 2. Initialize: 
        //    import OpenAI from 'openai';
        //    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        //
        // 3. Convert File to Base64:
        //    const arrayBuffer = await file.arrayBuffer();
        //    const buffer = Buffer.from(arrayBuffer);
        //    const base64Image = buffer.toString('base64');
        //
        // 4. Send to Vision Model:
        //    const response = await openai.chat.completions.create({
        //      model: "gpt-4o",
        //      response_format: { type: "json_object" },
        //      messages: [
        //        {
        //          role: "user",
        //          content: [
        //            { type: "text", text: "Extrae los siguientes datos de este recibo en formato JSON puro: { \"amount\": numero (total final decimal), \"merchant\": string (nombre del negocio), \"date\": string (YYYY-MM-DD) }" },
        //            { type: "image_url", image_url: { url: `data:${file.type};base64,${base64Image}` } }
        //          ]
        //        }
        //      ]
        //    });
        //
        //    const extractedData = JSON.parse(response.choices[0].message.content);
        //    return NextResponse.json({ data: extractedData });
        // ---------------------------------------------- //

        // SIMULATED MOCK AI DELAY (Remove when connecting real AI)
        await new Promise((resolve) => setTimeout(resolve, 2500));

        // Simulated "Detected" data by the mock AI
        const mockExtractedData = {
            amount: 149.99,
            merchant: "Ejemplo AI Supermercado",
            date: new Date().toISOString().split('T')[0] // today's date
        };

        return NextResponse.json({ data: mockExtractedData });

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return NextResponse.json(
            { error: 'Internal server error analyzing document' },
            { status: 500 }
        );
    }
}
