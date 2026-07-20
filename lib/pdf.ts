import { Meal, UserRecipe } from './types';

type Recipe = Partial<Meal> & Partial<UserRecipe> & { name: string };

export async function generateRecipePDF(recipe: Recipe): Promise<Buffer> {
  // pdfmake bundles its own fonts — no file system access needed
  const PdfPrinter = require('pdfmake/build/pdfmake');
  const vfsFonts = require('pdfmake/build/vfs_fonts');
  PdfPrinter.vfs = vfsFonts.pdfMake?.vfs || vfsFonts.vfs || {};

  const sage   = '#4A7859';
  const dark   = '#2F3A32';
  const mid    = '#5E6A61';
  const cream  = '#F7F4EE';

  const meta = [
    recipe.cuisine,
    recipe.total_time   && `⏱ ${recipe.total_time}`,
    recipe.serves       && `Serves ${recipe.serves}`,
    recipe.difficulty   && `${recipe.difficulty}`,
  ].filter(Boolean).join('   ·   ');

  const ingredientRows = (recipe.ingredients || []).map(ing => ([
    { text: ing.amount || '', color: sage, bold: true, margin: [0, 2, 8, 2] },
    { text: ing.item, color: dark, margin: [0, 2, 0, 2] },
  ]));

  const instructionItems = (recipe.instructions || []).map((step, i) => ({
    columns: [
      {
        width: 28,
        stack: [{
          text: String(i + 1),
          alignment: 'center',
          color: '#fff',
          bold: true,
          fontSize: 10,
          margin: [0, 1, 0, 0],
        }],
        fillColor: sage,
      },
      {
        text: step.replace(/^Step \d+:\s*/i, ''),
        color: dark,
        fontSize: 11,
        margin: [8, 2, 0, 2],
      },
    ],
    margin: [0, 0, 0, 6],
  }));

  const prepItems = (recipe.prep_ahead || []).map(tip => ({
    columns: [
      { text: '✓', color: sage, bold: true, width: 16 },
      { text: tip, color: mid, fontSize: 11, margin: [4, 0, 0, 0] },
    ],
    fillColor: '#EDF4EF',
    margin: [0, 0, 0, 4],
  }));

  function section(title: string, content: any[]) {
    if (!content.length) return [];
    return [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#E7E0D6' }], margin: [0, 12, 0, 6] },
      { text: title, color: sage, bold: true, fontSize: 14, margin: [0, 0, 0, 8] },
      ...content,
    ];
  }

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [56, 56, 56, 56],
    background: () => ({ canvas: [{ type: 'rect', x: 0, y: 0, w: 612, h: 120, color: sage }] }),
    content: [
      // Header space (filled by background)
      { text: recipe.name, color: '#fff', bold: true, fontSize: 26, margin: [0, 0, 0, 6] },
      { text: meta, color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: [0, 0, 0, 40] },

      // Time strip
      ...(meta ? [{
        columns: [
          recipe.prep_time  && { stack: [{ text: 'PREP',  color: '#aaa', fontSize: 8, bold: true }, { text: recipe.prep_time,  color: dark, bold: true, fontSize: 13 }], alignment: 'center' },
          recipe.cook_time  && { stack: [{ text: 'COOK',  color: '#aaa', fontSize: 8, bold: true }, { text: recipe.cook_time,  color: dark, bold: true, fontSize: 13 }], alignment: 'center' },
          recipe.total_time && { stack: [{ text: 'TOTAL', color: '#aaa', fontSize: 8, bold: true }, { text: recipe.total_time, color: dark, bold: true, fontSize: 13 }], alignment: 'center' },
          recipe.serves     && { stack: [{ text: 'SERVES',color: '#aaa', fontSize: 8, bold: true }, { text: String(recipe.serves), color: dark, bold: true, fontSize: 13 }], alignment: 'center' },
        ].filter(Boolean),
        fillColor: cream,
        margin: [0, 0, 0, 16],
      }] : []),

      // Description
      ...(recipe.description ? [{ text: recipe.description, color: mid, italics: true, fontSize: 12, margin: [0, 0, 0, 8] }] : []),

      // Ingredients
      ...section('Ingredients', ingredientRows.length ? [{
        table: { widths: [80, '*'], body: ingredientRows },
        layout: 'noBorders',
      }] : []),

      // Instructions
      ...section('Instructions', instructionItems),

      // Prep ahead
      ...section('Prepare Ahead', prepItems),
    ],
    footer: {
      columns: [
        { text: 'Shared via Fornello · Fatto a Casa', alignment: 'center', color: '#fff', fontSize: 9 },
      ],
      fillColor: sage,
      margin: [0, 8, 0, 8],
    },
    defaultStyle: { font: 'Roboto', fontSize: 11, color: dark },
  };

  return new Promise((resolve, reject) => {
    try {
      const pdf = PdfPrinter.createPdf(docDefinition);
      pdf.getBuffer((buffer: Buffer) => resolve(buffer));
    } catch (e) {
      reject(e);
    }
  });
}
