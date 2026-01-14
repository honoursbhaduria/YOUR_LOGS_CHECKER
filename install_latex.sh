#!/bin/bash
# Install LaTeX for Report Generation

echo "📦 Installing LaTeX packages for professional PDF reports..."
echo "This may take a few minutes..."

# Install minimal LaTeX distribution
sudo apt-get update
sudo apt-get install -y \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra

# Verify installation
if command -v pdflatex &> /dev/null; then
    echo "✅ LaTeX installed successfully!"
    pdflatex --version | head -1
else
    echo "❌ LaTeX installation failed"
    exit 1
fi

echo ""
echo "💡 You can now generate professional LaTeX-based PDF reports"
echo "   Choose 'LaTeX PDF' format in the report generation page"
