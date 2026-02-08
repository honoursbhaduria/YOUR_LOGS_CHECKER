import React, { useState, useEffect } from 'react';

interface LaTeXEditorProps {
  initialLatex: string;
  caseName: string;
  onCompile: (latexSource: string, download: boolean) => Promise<Blob | null>;
  onClose: () => void;
  isCompiling?: boolean;
}

const LaTeXEditor: React.FC<LaTeXEditorProps> = ({
  initialLatex,
  caseName,
  onCompile,
  onClose,
  isCompiling = false,
}) => {
  const [latexSource, setLatexSource] = useState(initialLatex);
  const [isDirty, setIsDirty] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Update latexSource when initialLatex changes
  useEffect(() => {
    setLatexSource(initialLatex);
    setIsDirty(false);
  }, [initialLatex]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    console.log('LaTeX editor: text changed, length:', newValue.length);
    setLatexSource(newValue);
    setIsDirty(true);
  };

  const handleCompile = async () => {
    await onCompile(latexSource, true);
    setIsDirty(false);
  };

  const handleCompilePreview = async () => {
    // Compile and show preview in the right pane
    console.log('Compiling LaTeX preview with source length:', latexSource.length);
    console.log('First 100 chars:', latexSource.substring(0, 100));
    
    setIsPreviewLoading(true);
    setPreviewError(null);
    try {
      const blob = await onCompile(latexSource, false);
      if (blob) {
        console.log('PDF compilation successful, blob size:', blob.size);
        // Revoke old URL to avoid memory leaks
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewError(null);
        setIsDirty(false); // Mark as saved after successful preview
      } else {
        console.error('Compilation returned null blob');
        setPreviewError('PDF compilation failed. pdflatex may not be available on the server.');
      }
    } catch (error: any) {
      console.error('Compilation failed:', error);
      setPreviewError(error?.message || 'Compilation failed - check server logs');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleReset = () => {
    setLatexSource(initialLatex);
    setIsDirty(false);
  };

  const lineCount = latexSource.split('\n').length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-[98%] h-[98%] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
          <div>
            <h2 className="text-lg font-medium text-zinc-100">
              LaTeX Report Editor
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {caseName} • {lineCount} lines {isDirty && '• Modified'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-zinc-400 hover:text-zinc-100 transition px-4 py-2 border border-zinc-700 rounded-lg text-sm"
            >
              {showPreview ? 'Code Only' : 'Split View'}
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 transition text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="btn-primary"
            >
              {isCompiling ? 'Compiling...' : 'Compile & Download'}
            </button>

            <button
              onClick={handleCompilePreview}
              disabled={isCompiling || isPreviewLoading}
              className="btn-secondary"
            >
              {isPreviewLoading ? 'Compiling...' : 'Preview PDF'}
            </button>

            {isDirty && (
              <button
                onClick={handleReset}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <kbd className="bg-zinc-800 px-2 py-1 rounded text-xs border border-zinc-700">Ctrl</kbd>
              <span>+</span>
              <kbd className="bg-zinc-800 px-2 py-1 rounded text-xs border border-zinc-700">S</kbd>
              <span>= Compile</span>
            </div>
          </div>
        </div>

        {/* Editor Area - Split Screen */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Side - Code Editor */}
          <div className={`flex border-r border-zinc-800 ${showPreview ? 'w-1/2' : 'w-full'}`}>
            {/* Line Numbers */}
            <div className="bg-zinc-900 border-r border-zinc-800 p-4 overflow-y-auto text-right select-none" style={{ width: '60px' }}>
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1} className="text-zinc-600 text-sm font-mono leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code Editor */}
            <div className="flex-1 overflow-hidden">
              <textarea
                id="latex-editor-textarea"
                value={latexSource}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    handleCompile();
                  }
                }}
                className="w-full h-full p-4 bg-zinc-950 text-zinc-100 font-mono text-sm leading-6 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                readOnly={false}
                disabled={false}
                style={{
                  tabSize: 2,
                  fontFamily: "'Fira Code', 'Courier New', monospace",
                }}
                placeholder="LaTeX source code..."
                aria-label="LaTeX code editor"
              />
            </div>
          </div>

          {/* Right Side - PDF Preview */}
          {showPreview && (
            <div className="w-1/2 flex flex-col bg-zinc-900">
              <div className="p-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
                <h3 className="text-zinc-100 font-medium text-sm">PDF Preview</h3>
                <span className="text-xs text-zinc-600">Compile to see preview</span>
              </div>
              
              <div className="flex-1 overflow-auto bg-zinc-800 flex items-center justify-center p-4">
                {isPreviewLoading ? (
                  <div className="text-center text-zinc-400">
                    <div className="animate-spin w-8 h-8 border-2 border-zinc-500 border-t-emerald-500 rounded-full mx-auto mb-4"></div>
                    <p className="text-sm">Compiling LaTeX...</p>
                  </div>
                ) : previewError ? (
                  <div className="text-center text-amber-400 max-w-md">
                    <p className="text-base font-medium mb-2">PDF Preview Unavailable</p>
                    <p className="text-sm mb-4 text-zinc-400">{previewError}</p>
                    <div className="bg-zinc-900 rounded-lg p-4 text-left">
                      <p className="text-xs text-zinc-500 mb-2">To get your report:</p>
                      <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Click <strong>"Compile & Download"</strong> to get the .tex file</li>
                        <li>Upload to <a href="https://www.overleaf.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">Overleaf.com</a> (free)</li>
                        <li>Click "Recompile" in Overleaf to get PDF</li>
                      </ol>
                    </div>
                  </div>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full bg-white rounded"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="text-center text-zinc-500">
                    <p className="text-base font-medium mb-2 text-zinc-400">No Preview Yet</p>
                    <p className="text-sm mb-4">Click "Preview PDF" to compile and see the result</p>
                    <div className="text-xs text-zinc-600 max-w-md">
                      <p className="mb-2">Tips:</p>
                      <ul className="list-disc list-inside space-y-1 text-left">
                        <li>Edit LaTeX code on the left</li>
                        <li>Click "Preview PDF" to compile</li>
                        <li>Use "Compile & Download" to save</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Tips */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <div className="flex items-center gap-4">
              <span>Tip: Edit the code, then click "Preview PDF" to see changes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={isDirty ? 'text-amber-400' : 'text-emerald-400'}>
                {isDirty ? '● Modified - Click Preview PDF' : '✓ Up to date'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaTeXEditor;
