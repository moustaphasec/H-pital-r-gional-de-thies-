const fs = require('fs');

const filesToModify = ['appointment.html', 'suivi.html', 'contact.html'];

for (const filepath of filesToModify) {
    if (!fs.existsSync(filepath)) continue;
    let content = fs.readFileSync(filepath, 'utf8');

    // Regex to capture the label block and input/textarea/select block
    const pattern = /<div\s+class="form-group">\s*<label\s+for="([^"]+)">([^<]+(?:<span[^>]*>[^<]*<\/span>)?)[^<]*<\/label>\s*<(input|textarea|select)([^>]+)>(.*?)<\/\3>|<div\s+class="form-group">\s*<label\s+for="([^"]+)">([^<]+(?:<span[^>]*>[^<]*<\/span>)?)[^<]*<\/label>\s*<input([^>]+)>/ig;

    const newContent = content.replace(pattern, (match, p1, p2, p3, p4, p5, p6, p7, p8) => {
        // If it's a textarea/select (with closing tag)
        if (p3) {
            const tag = p3;
            const labelFor = p1;
            const labelText = p2;
            let attrs = p4;
            const inner = p5;

            if (tag.toLowerCase() === 'input' || tag.toLowerCase() === 'textarea') {
                if (attrs.includes('placeholder=')) {
                    attrs = attrs.replace(/placeholder="[^"]*"/, 'placeholder=" "');
                } else {
                    attrs += ' placeholder=" "';
                }
            }
            return `<div class="form-group floating">\n                                <${tag}${attrs}>${inner}</${tag}>\n                                <label for="${labelFor}">${labelText.trim()}</label>`;
        }
        // If it's an input (no closing tag)
        else if (p8) {
            const labelFor = p6;
            const labelText = p7;
            let attrs = p8;

            if (attrs.includes('placeholder=')) {
                attrs = attrs.replace(/placeholder="[^"]*"/, 'placeholder=" "');
            } else {
                attrs += ' placeholder=" "';
            }
            return `<div class="form-group floating">\n                                <input${attrs}>\n                                <label for="${labelFor}">${labelText.trim()}</label>`;
        }
        return match;
    });

    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`Processed ${filepath}`);
}
