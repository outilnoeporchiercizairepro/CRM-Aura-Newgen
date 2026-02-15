const fs = require('fs');

const inputFile = "C:/Users/noepo/.gemini/antigravity/brain/595e8b84-d9a5-4070-9376-1ea824390f15/.system_generated/steps/543/output.txt";
const outputFile = "d:/ANTIGRAVITY/CRM AURA/src/types/supabase.ts";

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    let typesContent = content;
    try {
        const json = JSON.parse(content);
        if (json.types) {
            typesContent = json.types;
        }
    } catch (e) {
        console.log("Could not parse as JSON, writing raw content or handling differently.");
    }

    const dir = outputFile.substring(0, outputFile.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputFile, typesContent);
    console.log("Types extracted successfully to " + outputFile);
} catch (err) {
    console.error("Error:", err);
    process.exit(1);
}
