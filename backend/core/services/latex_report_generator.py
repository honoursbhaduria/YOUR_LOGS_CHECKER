"""
LaTeX Report Generation Service
Generates professional forensic reports using LaTeX with nested structure
"""
from pylatex import Document, Section, Subsection, Table, Tabular, MultiColumn, Command
from pylatex.utils import NoEscape, bold
from pylatex.package import Package
from datetime import datetime
from typing import Dict, List
import os
import subprocess
import tempfile
import csv
import io
import logging
import requests

logger = logging.getLogger(__name__)


class LaTeXReportGenerator:
    """
    Generates LaTeX forensic reports and compiles to PDF
    Supports nested sections and hierarchical data presentation
    """
    
    def generate_latex_report(self, case_data: Dict) -> tuple:
        """
        Generate LaTeX report and compile to PDF
        
        Args:
            case_data: Dict containing case, evidence, events, stories
            
        Returns:
            tuple: (latex_content: str, pdf_bytes: bytes)
        """
        # Create LaTeX document
        doc = Document(documentclass='article')
        
        # Add packages
        doc.packages.append(Package('geometry', options=['margin=1in']))
        doc.packages.append(Package('fancyhdr'))
        doc.packages.append(Package('graphicx'))
        doc.packages.append(Package('longtable'))
        doc.packages.append(Package('booktabs'))
        doc.packages.append(Package('xcolor', options=['table']))
        
        # Setup header/footer
        doc.preamble.append(Command('pagestyle', 'fancy'))
        doc.preamble.append(Command('fancyhf', ''))
        doc.preamble.append(NoEscape(r'\fancyhead[L]{Forensic Log Analysis Report}'))
        doc.preamble.append(NoEscape(r'\fancyhead[R]{\today}'))
        doc.preamble.append(NoEscape(r'\fancyfoot[C]{\thepage}'))
        
        # Title page
        self._add_title_page(doc, case_data)
        doc.append(NoEscape(r'\newpage'))
        
        # Table of contents
        doc.append(NoEscape(r'\tableofcontents'))
        doc.append(NoEscape(r'\newpage'))
        
        # Chain of Custody
        self._add_chain_of_custody(doc, case_data)
        doc.append(NoEscape(r'\newpage'))
        
        # Executive Summary (Attack Stories)
        self._add_executive_summary(doc, case_data)
        doc.append(NoEscape(r'\newpage'))
        
        # Event Analysis
        self._add_event_analysis(doc, case_data)
        
        # Generate LaTeX content
        latex_content = doc.dumps()
        
        # Compile to PDF
        pdf_bytes = self._compile_latex_to_pdf(latex_content)
        
        return latex_content, pdf_bytes
    
    def generate_nested_latex_report(self, case_data: Dict) -> tuple:
        """
        Generate advanced nested LaTeX report with hierarchical structure
        
        Args:
            case_data: Dict containing case, evidence, events, stories
            
        Returns:
            tuple: (latex_content: str, pdf_bytes: bytes, csv_data: str)
        """
        # Create LaTeX document with advanced formatting
        doc = Document(documentclass='report')  # Use report instead of article for better nesting
        
        # Add packages
        doc.packages.append(Package('geometry', options=['margin=0.8in']))
        doc.packages.append(Package('fancyhdr'))
        doc.packages.append(Package('graphicx'))
        doc.packages.append(Package('longtable'))
        doc.packages.append(Package('booktabs'))
        doc.packages.append(Package('xcolor', options=['table']))
        doc.packages.append(Package('hyperref'))  # For TOC links
        
        # Setup header/footer
        doc.preamble.append(Command('pagestyle', 'fancy'))
        doc.preamble.append(Command('fancyhf', ''))
        doc.preamble.append(NoEscape(r'\fancyhead[L]{Forensic Log Analysis Report}'))
        doc.preamble.append(NoEscape(r'\fancyhead[R]{\today}'))
        doc.preamble.append(NoEscape(r'\fancyfoot[C]{\thepage}'))
        
        # Title page
        self._add_title_page(doc, case_data)
        doc.append(NoEscape(r'\newpage'))
        
        # Table of contents
        doc.append(NoEscape(r'\tableofcontents'))
        doc.append(NoEscape(r'\newpage'))
        
        # Investigation Overview (Main Section)
        with doc.create(Section('Investigation Overview')):
            with doc.create(Subsection('Case Information')):
                self._add_nested_case_info(doc, case_data)
            
            with doc.create(Subsection('Chain of Custody')):
                self._add_nested_chain_of_custody(doc, case_data)
        
        doc.append(NoEscape(r'\newpage'))
        
        # Executive Summary (Main Section)
        with doc.create(Section('Executive Summary - Attack Stories')):
            self._add_nested_attack_stories(doc, case_data)
        
        doc.append(NoEscape(r'\newpage'))
        
        # Detailed Event Analysis (Main Section with multiple subsections)
        with doc.create(Section('Event Analysis Details')):
            self._add_nested_event_analysis(doc, case_data)
        
        doc.append(NoEscape(r'\newpage'))
        
        # Risk Summary (Main Section)
        with doc.create(Section('Risk Assessment Summary')):
            self._add_nested_risk_summary(doc, case_data)
        
        # Generate LaTeX content
        latex_content = doc.dumps()
        
        # Compile to PDF
        pdf_bytes = self._compile_latex_to_pdf(latex_content)
        
        # Generate CSV data
        csv_data = self._generate_report_csv(case_data)
        
        return latex_content, pdf_bytes, csv_data
    
    def _add_nested_case_info(self, doc, case_data: Dict):
        """Add nested case information"""
        with doc.create(Tabular('|l|p{10cm}|')) as table:
            table.add_hline()
            table.add_row((bold('Field'), bold('Value')))
            table.add_hline()
            table.add_row(('Case Name', self._escape_latex(case_data['case']['name'])))
            table.add_row(('Status', case_data['case']['status']))
            table.add_row(('Investigator', self._escape_latex(case_data['case']['created_by'])))
            table.add_row(('Generated', datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')))
            table.add_row(('Evidence Files', len(case_data['evidence_files'])))
            table.add_row(('Events Analyzed', len(case_data['scored_events'])))
            table.add_hline()
    
    def _add_nested_chain_of_custody(self, doc, case_data: Dict):
        """Add nested chain of custody with detailed evidence table"""
        doc.append(f"Total evidence files: {len(case_data['evidence_files'])}")
        doc.append(NoEscape(r'\vspace{0.3cm}'))
        
        if case_data['evidence_files']:
            with doc.create(Tabular('|p{4cm}|p{3cm}|p{3cm}|p{2cm}|')) as table:
                table.add_hline()
                table.add_row((bold('Filename'), bold('Hash (First 16)'), bold('Uploaded'), bold('By')))
                table.add_hline()
                
                for evidence in case_data['evidence_files'][:15]:
                    table.add_row((
                        self._escape_latex(evidence['filename'][:30]),
                        evidence['file_hash'][:16] if evidence['file_hash'] else 'N/A',
                        evidence['uploaded_at'][:10],
                        self._escape_latex(evidence['uploaded_by'][:15])
                    ))
                    table.add_hline()
    
    def _add_nested_attack_stories(self, doc, case_data: Dict):
        """Add nested attack stories with subsections"""
        if not case_data['stories']:
            doc.append('No attack patterns identified.')
            return
        
        for i, story in enumerate(case_data['stories'], 1):
            with doc.create(Subsection(f"Pattern {i}: {self._escape_latex(story['title'][:50])}")):
                # Create nested structure within each story
                with doc.create(Subsection('Details')):
                    details_table = [
                        ['Attack Phase', story['attack_phase']],
                        ['Confidence Score', f"{story['avg_confidence']:.2%}"],
                    ]
                    
                    with doc.create(Tabular('|l|p{8cm}|')) as table:
                        table.add_hline()
                        for row in details_table:
                            table.add_row((bold(row[0]), row[1]))
                        table.add_hline()
                
                with doc.create(Subsection('Narrative')):
                    doc.append(self._escape_latex(story['narrative'][:500]))
                    if len(story['narrative']) > 500:
                        doc.append(f"\n... (truncated, {len(story['narrative'])} total characters)")
    
    def _add_nested_event_analysis(self, doc, case_data: Dict):
        """Add nested event analysis with risk level subsections"""
        total_events = len(case_data['scored_events'])
        doc.append(f"Total events analyzed: {total_events}")
        doc.append(NoEscape(r'\vspace{0.3cm}'))
        
        # Statistics subsection
        with doc.create(Subsection('Statistics')):
            high_conf = [e for e in case_data['scored_events'] if e['confidence'] >= 0.7]
            medium_conf = [e for e in case_data['scored_events'] if 0.4 <= e['confidence'] < 0.7]
            low_conf = [e for e in case_data['scored_events'] if e['confidence'] < 0.4]
            
            stats_data = [
                ['High Confidence (≥0.7)', len(high_conf), f"{len(high_conf)/max(1,total_events)*100:.1f}%"],
                ['Medium Confidence (0.4-0.7)', len(medium_conf), f"{len(medium_conf)/max(1,total_events)*100:.1f}%"],
                ['Low Confidence (<0.4)', len(low_conf), f"{len(low_conf)/max(1,total_events)*100:.1f}%"],
            ]
            
            with doc.create(Tabular('|l|r|r|')) as table:
                table.add_hline()
                table.add_row((bold('Confidence Level'), bold('Count'), bold('Percentage')))
                table.add_hline()
                for row in stats_data:
                    table.add_row(tuple(row))
                table.add_hline()
        
        # High confidence events subsection
        high_conf = [e for e in case_data['scored_events'] if e['confidence'] >= 0.7]
        if high_conf:
            with doc.create(Subsection(f'High Confidence Events ({len(high_conf)})')):
                with doc.create(Tabular('|p{2.5cm}|p{2cm}|p{1.5cm}|p{5cm}|')) as table:
                    table.add_hline()
                    table.add_row((bold('Timestamp'), bold('Event Type'), bold('Risk'), bold('Description')))
                    table.add_hline()
                    
                    for event in high_conf[:30]:
                        table.add_row((
                            str(event.get('timestamp', ''))[:19],
                            (event.get('event_type') or '')[:18],
                            (event.get('risk_label') or '')[:12],
                            self._escape_latex((event.get('inference_text') or 'N/A')[:80])
                        ))
                        table.add_hline()
        
        # Medium confidence events subsection
        medium_conf = [e for e in case_data['scored_events'] if 0.4 <= e['confidence'] < 0.7]
        if medium_conf:
            with doc.create(Subsection(f'Medium Confidence Events ({len(medium_conf)})')):
                with doc.create(Tabular('|p{2.5cm}|p{2cm}|p{1.5cm}|p{5cm}|')) as table:
                    table.add_hline()
                    table.add_row((bold('Timestamp'), bold('Event Type'), bold('Risk'), bold('Description')))
                    table.add_hline()
                    
                    for event in medium_conf[:20]:
                        table.add_row((
                            str(event.get('timestamp', ''))[:19],
                            (event.get('event_type') or '')[:18],
                            (event.get('risk_label') or '')[:12],
                            self._escape_latex((event.get('inference_text') or 'N/A')[:80])
                        ))
                        table.add_hline()
    
    def _add_nested_risk_summary(self, doc, case_data: Dict):
        """Add nested risk summary section"""
        with doc.create(Subsection('Risk Distribution')):
            risk_counts = {}
            for event in case_data['scored_events']:
                risk = event['risk_label']
                risk_counts[risk] = risk_counts.get(risk, 0) + 1
            
            with doc.create(Tabular('|l|r|r|')) as table:
                table.add_hline()
                table.add_row((bold('Risk Level'), bold('Count'), bold('Percentage')))
                table.add_hline()
                
                total = sum(risk_counts.values()) or 1
                for risk in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']:
                    count = risk_counts.get(risk, 0)
                    percentage = f"{count/total*100:.1f}%" if count > 0 else "0%"
                    table.add_row((risk, count, percentage))
                    table.add_hline()
        
        with doc.create(Subsection('Recommendations')):
            recommendations = [
                'Review all high-confidence events for immediate action',
                'Investigate patterns in medium-confidence events',
                'Archive or suppress low-confidence noise',
                'Correlate events across multiple evidence files',
                'Generate follow-up investigation reports as needed',
            ]
            
            for i, rec in enumerate(recommendations, 1):
                doc.append(f"{i}. {rec}")
                doc.append(NoEscape(r'\\'))
    
    def _generate_report_csv(self, case_data: Dict) -> str:
        """
        Generate CSV export of report data
        
        Args:
            case_data: Dict containing case, evidence, events, stories
            
        Returns:
            str: CSV formatted string
        """
        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer)
        
        # Write header with metadata
        writer.writerow(['Forensic Log Analysis Report - Events Data'])
        writer.writerow(['Case', case_data['case']['name']])
        writer.writerow(['Generated', datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')])
        writer.writerow([])
        
        # Write events table
        writer.writerow(['Timestamp', 'Event Type', 'User', 'Host', 'Risk Level', 'Confidence', 'Description', 'Raw Message'])
        
        for event in case_data['scored_events']:
            writer.writerow([
                event.get('timestamp', ''),
                event.get('event_type', ''),
                event.get('user', ''),
                event.get('host', ''),
                event.get('risk_label', ''),
                f"{event.get('confidence', 0):.4f}",
                (event.get('inference_text', 'N/A') or 'N/A')[:200],
                (event.get('raw_message', '') or '')[:300]
            ])
        
        writer.writerow([])
        writer.writerow(['Attack Stories Summary'])
        writer.writerow(['Title', 'Attack Phase', 'Confidence', 'Narrative'])
        
        for story in case_data['stories']:
            writer.writerow([
                story.get('title', ''),
                story.get('attack_phase', ''),
                f"{story.get('avg_confidence', 0):.4f}",
                (story.get('narrative', '') or '')[:500]
            ])
        
        return csv_buffer.getvalue()
    
    def _add_title_page(self, doc: Document, case_data: Dict):
        """Add title page"""
        doc.append(NoEscape(r'\begin{titlepage}'))
        doc.append(NoEscape(r'\centering'))
        doc.append(NoEscape(r'\vspace*{2cm}'))
        doc.append(NoEscape(r'{\Huge \textbf{FORENSIC LOG ANALYSIS REPORT}}\\[1cm]'))
        doc.append(NoEscape(r'{\Large Digital Evidence Investigation}\\[2cm]'))
        
        doc.append(NoEscape(r'\begin{tabular}{ll}'))
        doc.append(NoEscape(f"\\textbf{{Case Name:}} & {self._escape_latex(case_data['case']['name'])} \\\\[0.3cm]"))
        doc.append(NoEscape(f"\\textbf{{Status:}} & {case_data['case']['status']} \\\\[0.3cm]"))
        doc.append(NoEscape(f"\\textbf{{Investigator:}} & {self._escape_latex(case_data['case']['created_by'])} \\\\[0.3cm]"))
        doc.append(NoEscape(f"\\textbf{{Generated:}} & {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC \\\\[0.3cm]"))
        doc.append(NoEscape(f"\\textbf{{Evidence Files:}} & {len(case_data['evidence_files'])} \\\\[0.3cm]"))
        doc.append(NoEscape(f"\\textbf{{Events Analyzed:}} & {len(case_data['scored_events'])} \\\\"))
        doc.append(NoEscape(r'\end{tabular}'))
        
        doc.append(NoEscape(r'\vfill'))
        doc.append(NoEscape(r'{\large Generated by AI-Powered Forensic Analysis System}'))
        doc.append(NoEscape(r'\end{titlepage}'))
    
    def _add_chain_of_custody(self, doc: Document, case_data: Dict):
        """Add chain of custody section"""
        with doc.create(Section('Chain of Custody')):
            doc.append('This section documents the evidence files analyzed in this investigation.')
            doc.append(NoEscape(r'\vspace{0.5cm}'))
            
            if case_data['evidence_files']:
                with doc.create(Tabular('|l|l|l|l|')) as table:
                    table.add_hline()
                    table.add_row((bold('Filename'), bold('Hash (SHA-256)'), bold('Uploaded'), bold('Uploaded By')))
                    table.add_hline()
                    
                    for evidence in case_data['evidence_files'][:20]:  # Limit to 20
                        table.add_row((
                            self._escape_latex(evidence['filename']),
                            evidence['file_hash'][:16] + '...',
                            evidence['uploaded_at'],
                            self._escape_latex(evidence['uploaded_by'])
                        ))
                        table.add_hline()
    
    def _add_executive_summary(self, doc: Document, case_data: Dict):
        """Add executive summary with attack stories"""
        with doc.create(Section('Executive Summary')):
            doc.append('This investigation identified the following security patterns:')
            doc.append(NoEscape(r'\vspace{0.5cm}'))
            
            if case_data['stories']:
                for i, story in enumerate(case_data['stories'], 1):
                    with doc.create(Subsection(f"Pattern {i}: {self._escape_latex(story['title'])}")):
                        doc.append(NoEscape(r'\textbf{Attack Phase:} '))
                        doc.append(story['attack_phase'])
                        doc.append(NoEscape(r'\\[0.3cm]'))
                        
                        doc.append(NoEscape(r'\textbf{Confidence:} '))
                        doc.append(f"{story['avg_confidence']:.2f}")
                        doc.append(NoEscape(r'\\[0.3cm]'))
                        
                        doc.append(NoEscape(r'\textbf{Analysis:}\\'))
                        doc.append(self._escape_latex(story['narrative']))
            else:
                doc.append('No attack patterns identified.')
    
    def _add_event_analysis(self, doc: Document, case_data: Dict):
        """Add detailed event analysis"""
        with doc.create(Section('Event Analysis')):
            doc.append(f"Total events analyzed: {len(case_data['scored_events'])}")
            doc.append(NoEscape(r'\vspace{0.5cm}'))
            
            # High confidence events table
            high_conf = [e for e in case_data['scored_events'] if e['confidence'] >= 0.7]
            
            if high_conf:
                with doc.create(Subsection('High Confidence Events')):
                    with doc.create(Tabular('|p{3cm}|p{2cm}|p{2cm}|p{6cm}|')) as table:
                        table.add_hline()
                        table.add_row((bold('Timestamp'), bold('Event Type'), bold('Risk'), bold('Description')))
                        table.add_hline()
                        
                        for event in high_conf[:50]:  # Limit to 50
                            table.add_row((
                                str(event.get('timestamp', ''))[:19],
                                (event.get('event_type') or '')[:20],
                                (event.get('risk_label') or ''),
                                self._escape_latex((event.get('inference_text') or 'N/A')[:100])
                            ))
                            table.add_hline()
    
    def _escape_latex(self, text: str) -> str:
        """Escape special LaTeX characters"""
        if not text:
            return ''
        replacements = {
            '&': r'\&',
            '%': r'\%',
            '$': r'\$',
            '#': r'\#',
            '_': r'\_',
            '{': r'\{',
            '}': r'\}',
            '~': r'\textasciitilde{}',
            '^': r'\^{}',
            '\\': r'\textbackslash{}',
        }
        for char, replacement in replacements.items():
            text = text.replace(char, replacement)
        return text
    
    def _is_pdflatex_available(self) -> bool:
        """Check if pdflatex is installed and available"""
        try:
            result = subprocess.run(
                ['which', 'pdflatex'],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except Exception:
            return False
    
    def _compile_latex_online(self, latex_content: str) -> bytes:
        """Compile LaTeX to PDF using online API (latexonline.cc)"""
        
        # Try latexonline.cc API
        try:
            url = "https://latexonline.cc/compile"
            
            # Send as form data
            response = requests.post(
                url,
                data={'text': latex_content},
                timeout=60,
                headers={'Accept': 'application/pdf'}
            )
            
            if response.status_code == 200 and response.headers.get('content-type', '').startswith('application/pdf'):
                return response.content
            else:
                raise Exception(f"Online compilation failed: HTTP {response.status_code}")
        except requests.exceptions.Timeout:
            raise Exception("Online LaTeX compilation timeout (60s)")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Online compilation error: {str(e)}")
    
    def _compile_latex_to_pdf(self, latex_content: str) -> bytes:
        """Compile LaTeX to PDF - uses local pdflatex or online API as fallback"""
        
        # Try local pdflatex first
        if self._is_pdflatex_available():
            try:
                return self._compile_latex_local(latex_content)
            except Exception as local_error:
                # If local fails, try online
                logger.warning(f"Local pdflatex failed: {local_error}, trying online API")
        
        # Fallback to online API
        return self._compile_latex_online(latex_content)
    
    def _compile_latex_local(self, latex_content: str) -> bytes:
        """Compile LaTeX to PDF using local pdflatex"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write LaTeX file
            tex_path = os.path.join(tmpdir, 'report.tex')
            with open(tex_path, 'w', encoding='utf-8') as f:
                f.write(latex_content)
            
            # Compile with pdflatex (run twice for TOC)
            try:
                for _ in range(2):
                    subprocess.run(
                        ['pdflatex', '-interaction=nonstopmode', '-output-directory', tmpdir, tex_path],
                        capture_output=True,
                        timeout=30
                    )
                
                # Read PDF
                pdf_path = os.path.join(tmpdir, 'report.pdf')
                if os.path.exists(pdf_path):
                    with open(pdf_path, 'rb') as f:
                        return f.read()
                else:
                    raise Exception("PDF compilation failed - file not generated")
            except subprocess.TimeoutExpired:
                raise Exception("LaTeX compilation timeout")
            except FileNotFoundError:
                raise Exception("pdflatex not installed. Install with: sudo apt-get install texlive-latex-base texlive-fonts-recommended")
    
    def compile_custom_latex(self, latex_content: str) -> tuple:
        """
        Compile custom LaTeX content provided by user
        
        Args:
            latex_content: User-edited LaTeX source code
            
        Returns:
            tuple: (pdf_bytes: bytes, error_message: str or None)
        """
        try:
            pdf_bytes = self._compile_latex_to_pdf(latex_content)
            return pdf_bytes, None
        except Exception as e:
            return None, str(e)
    
    def generate_latex_preview(self, case_data: Dict) -> str:
        """
        Generate LaTeX source code without compiling (for preview/editing)
        
        Args:
            case_data: Dict containing case, evidence, events, stories
            
        Returns:
            str: LaTeX source code
        """
        # Create LaTeX document
        doc = Document(documentclass='report')
        
        # Add packages
        doc.packages.append(Package('geometry', options=['margin=0.8in']))
        doc.packages.append(Package('fancyhdr'))
        doc.packages.append(Package('graphicx'))
        doc.packages.append(Package('longtable'))
        doc.packages.append(Package('booktabs'))
        doc.packages.append(Package('xcolor', options=['table']))
        doc.packages.append(Package('hyperref'))
        
        # Setup header/footer
        doc.preamble.append(Command('pagestyle', 'fancy'))
        doc.preamble.append(Command('fancyhf', ''))
        doc.preamble.append(NoEscape(r'\fancyhead[L]{Forensic Log Analysis Report}'))
        doc.preamble.append(NoEscape(r'\fancyhead[R]{\today}'))
        doc.preamble.append(NoEscape(r'\fancyfoot[C]{\thepage}'))
        
        # Title page
        self._add_title_page(doc, case_data)
        doc.append(NoEscape(r'\newpage'))
        
        # Table of contents
        doc.append(NoEscape(r'\tableofcontents'))
        doc.append(NoEscape(r'\newpage'))
        
        # Investigation Overview
        with doc.create(Section('Investigation Overview')):
            with doc.create(Subsection('Case Information')):
                self._add_nested_case_info(doc, case_data)
            
            with doc.create(Subsection('Chain of Custody')):
                self._add_nested_chain_of_custody(doc, case_data)
        
        doc.append(NoEscape(r'\newpage'))
        
        # Executive Summary
        with doc.create(Section('Executive Summary - Attack Stories')):
            self._add_nested_attack_stories(doc, case_data)
        
        doc.append(NoEscape(r'\newpage'))
        
        # Event Analysis
        with doc.create(Section('Event Analysis Details')):
            self._add_nested_event_analysis(doc, case_data)
        
        doc.append(NoEscape(r'\newpage'))
        
        # Risk Summary
        with doc.create(Section('Risk Assessment Summary')):
            self._add_nested_risk_summary(doc, case_data)
        
        # Return LaTeX source
        return doc.dumps()


# Singleton instance
latex_generator = LaTeXReportGenerator()
