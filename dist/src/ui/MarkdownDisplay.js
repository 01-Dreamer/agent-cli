"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownDisplay = MarkdownDisplay;
const react_1 = __importDefault(require("react"));
const ink_1 = require("ink");
const string_width_1 = __importDefault(require("string-width"));
const tableSeparatorRegex = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const MIN_COLUMN_WIDTH = 4;
const MAX_COLUMN_WIDTH = 34;
const TABLE_MARGIN = 4;
const CELL_PADDING = 2;
function stripInlineMarkdown(text) {
    return text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1');
}
function splitTableRow(line) {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => stripInlineMarkdown(cell.trim()));
}
function isTableStart(lines, index) {
    return /^\s*\|.+\|\s*$/.test(lines[index] ?? '')
        && tableSeparatorRegex.test(lines[index + 1] ?? '');
}
function terminalWidth() {
    return Math.max(50, process.stdout.columns || 80);
}
function visualWidth(value) {
    return (0, string_width_1.default)(value);
}
function sliceVisual(value, width) {
    let result = '';
    let used = 0;
    for (const char of Array.from(value)) {
        const charWidth = visualWidth(char);
        if (used + charWidth > width)
            break;
        result += char;
        used += charWidth;
    }
    return result;
}
function padVisual(value, width) {
    return `${value}${' '.repeat(Math.max(0, width - visualWidth(value)))}`;
}
function wrapVisual(value, width) {
    if (width <= 0)
        return [''];
    const lines = [];
    let current = '';
    let currentWidth = 0;
    for (const char of Array.from(value)) {
        const charWidth = visualWidth(char);
        if (currentWidth + charWidth > width && current) {
            lines.push(current.trimEnd());
            current = '';
            currentWidth = 0;
        }
        if (charWidth > width)
            continue;
        current += char;
        currentWidth += charWidth;
    }
    lines.push(current.trimEnd());
    return lines.length > 0 ? lines : [''];
}
function normalizeTable(headers, rows) {
    return {
        headers,
        rows: rows.map((row) => {
            const normalizedRow = [...row];
            while (normalizedRow.length < headers.length)
                normalizedRow.push('');
            return normalizedRow.slice(0, headers.length);
        }),
    };
}
function calculateColumnWidths(table, maxTableWidth) {
    const columnCount = table.headers.length;
    const columns = table.headers.map((header, index) => {
        const values = [header, ...table.rows.map((row) => row[index] ?? '')];
        const maxContentWidth = Math.max(...values.map(visualWidth), MIN_COLUMN_WIDTH);
        const preferredWidth = Math.min(maxContentWidth, MAX_COLUMN_WIDTH);
        const headerWidth = Math.min(Math.max(visualWidth(header), MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);
        return {
            minWidth: Math.min(Math.max(headerWidth, MIN_COLUMN_WIDTH), 12),
            preferredWidth: Math.max(preferredWidth, headerWidth),
        };
    });
    const fixedOverhead = columnCount + 1 + columnCount * CELL_PADDING;
    const available = Math.max(columnCount * MIN_COLUMN_WIDTH, maxTableWidth - fixedOverhead);
    const minTotal = columns.reduce((sum, column) => sum + column.minWidth, 0);
    if (minTotal >= available) {
        const baseWidth = Math.max(MIN_COLUMN_WIDTH, Math.floor(available / columnCount));
        let remaining = available - baseWidth * columnCount;
        return columns.map(() => {
            const width = baseWidth + (remaining > 0 ? 1 : 0);
            remaining -= 1;
            return width;
        });
    }
    const widths = columns.map((column) => column.minWidth);
    let remaining = available - minTotal;
    while (remaining > 0) {
        let grew = false;
        for (let index = 0; index < widths.length && remaining > 0; index += 1) {
            if (widths[index] < columns[index].preferredWidth) {
                widths[index] += 1;
                remaining -= 1;
                grew = true;
            }
        }
        if (!grew)
            break;
    }
    return widths;
}
function renderInline(text) {
    if (!text)
        return null;
    const parts = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        const token = match[0];
        if (token.startsWith('`')) {
            parts.push(react_1.default.createElement(ink_1.Text, { key: parts.length, color: "yellow" }, token.slice(1, -1)));
        }
        else if (token.startsWith('[')) {
            const linkText = token.match(/^\[([^\]]+)\]/)?.[1] ?? token;
            parts.push(react_1.default.createElement(ink_1.Text, { key: parts.length, color: "cyan" }, linkText));
        }
        else {
            parts.push(react_1.default.createElement(ink_1.Text, { key: parts.length, bold: true }, token.replace(/^(\*\*|__)/, '').replace(/(\*\*|__)$/, '')));
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    if (parts.length === 0) {
        return null;
    }
    return parts;
}
function MarkdownTable({ table }) {
    const widths = calculateColumnWidths(table, terminalWidth() - TABLE_MARGIN);
    const borderWidths = widths.map((width) => width + CELL_PADDING);
    const normalizedRows = table.rows.map((row) => {
        const normalizedRow = [...row];
        while (normalizedRow.length < table.headers.length)
            normalizedRow.push('');
        return normalizedRow.slice(0, table.headers.length);
    });
    const renderBorder = (type) => {
        const chars = {
            top: { left: '┌', middle: '┬', right: '┐' },
            middle: { left: '├', middle: '┼', right: '┤' },
            bottom: { left: '└', middle: '┴', right: '┘' },
        }[type];
        return `${chars.left}${borderWidths.map((width) => '─'.repeat(width)).join(chars.middle)}${chars.right}`;
    };
    const renderRow = (cells, isHeader = false) => {
        const wrappedCells = cells.map((cell, index) => wrapVisual(cell ?? '', widths[index]));
        const height = Math.max(...wrappedCells.map((cell) => cell.length), 1);
        const visualRows = [];
        for (let lineIndex = 0; lineIndex < height; lineIndex += 1) {
            visualRows.push(react_1.default.createElement(ink_1.Box, { key: lineIndex, flexDirection: "row" },
                react_1.default.createElement(ink_1.Text, { color: "gray" }, "\u2502"),
                wrappedCells.map((cell, cellIndex) => {
                    const line = sliceVisual(cell[lineIndex] ?? '', widths[cellIndex]);
                    return (react_1.default.createElement(react_1.default.Fragment, { key: cellIndex },
                        react_1.default.createElement(ink_1.Text, null,
                            ' ',
                            isHeader ? (react_1.default.createElement(ink_1.Text, { bold: true, color: "cyan" }, padVisual(line, widths[cellIndex]))) : (react_1.default.createElement(ink_1.Text, null, padVisual(line, widths[cellIndex]))),
                            ' '),
                        react_1.default.createElement(ink_1.Text, { color: "gray" }, "\u2502")));
                })));
        }
        return visualRows;
    };
    return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginY: 1 },
        react_1.default.createElement(ink_1.Text, { color: "gray" }, renderBorder('top')),
        renderRow(table.headers, true),
        react_1.default.createElement(ink_1.Text, { color: "gray" }, renderBorder('middle')),
        normalizedRows.map((row, index) => (react_1.default.createElement(react_1.default.Fragment, { key: index }, renderRow(row)))),
        react_1.default.createElement(ink_1.Text, { color: "gray" }, renderBorder('bottom'))));
}
function MarkdownDisplay({ text }) {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines = [];
    const flushCodeBlock = (key) => {
        blocks.push(react_1.default.createElement(ink_1.Box, { key: key, flexDirection: "column", marginY: 1, paddingLeft: 2, borderStyle: "single", borderColor: "gray" },
            codeLanguage ? react_1.default.createElement(ink_1.Text, { color: "gray" }, codeLanguage) : null,
            codeLines.length === 0 ? (react_1.default.createElement(ink_1.Text, { color: "gray" }, " ")) : (codeLines.map((line, index) => (react_1.default.createElement(ink_1.Text, { key: index, color: "yellow" }, line || ' '))))));
        codeLines = [];
        codeLanguage = '';
    };
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const codeFence = line.match(/^\s*```(\w*)\s*$/);
        if (codeFence) {
            if (inCodeBlock) {
                flushCodeBlock(`code-${index}`);
                inCodeBlock = false;
            }
            else {
                inCodeBlock = true;
                codeLanguage = codeFence[1] || '';
            }
            continue;
        }
        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }
        if (isTableStart(lines, index)) {
            const headers = splitTableRow(lines[index]);
            const rows = [];
            index += 2;
            while (index < lines.length && /^\s*\|.+\|\s*$/.test(lines[index])) {
                rows.push(splitTableRow(lines[index]));
                index += 1;
            }
            index -= 1;
            blocks.push(react_1.default.createElement(MarkdownTable, { key: `table-${index}`, table: normalizeTable(headers, rows) }));
            continue;
        }
        const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (heading) {
            blocks.push(react_1.default.createElement(ink_1.Box, { key: index, marginTop: heading[1].length <= 2 ? 1 : 0 },
                react_1.default.createElement(ink_1.Text, { bold: true, color: heading[1].length <= 2 ? 'cyan' : 'white' }, stripInlineMarkdown(heading[2]))));
            continue;
        }
        const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
        if (unordered) {
            blocks.push(react_1.default.createElement(ink_1.Box, { key: index, paddingLeft: 2 },
                react_1.default.createElement(ink_1.Text, { color: "gray" }, "- "),
                react_1.default.createElement(ink_1.Text, null, renderInline(unordered[1]))));
            continue;
        }
        const ordered = line.match(/^\s*(\d+)\.\s+(.+)$/);
        if (ordered) {
            blocks.push(react_1.default.createElement(ink_1.Box, { key: index, paddingLeft: 2 },
                react_1.default.createElement(ink_1.Text, { color: "gray" },
                    ordered[1],
                    ". "),
                react_1.default.createElement(ink_1.Text, null, renderInline(ordered[2]))));
            continue;
        }
        const quote = line.match(/^\s*>\s?(.+)$/);
        if (quote) {
            blocks.push(react_1.default.createElement(ink_1.Box, { key: index, paddingLeft: 2 },
                react_1.default.createElement(ink_1.Text, { color: "gray" }, "| "),
                react_1.default.createElement(ink_1.Text, { color: "gray" }, renderInline(quote[1]))));
            continue;
        }
        if (/^\s*([-*_]\s*){3,}$/.test(line)) {
            blocks.push(react_1.default.createElement(ink_1.Text, { key: index, color: "gray" }, "----------------"));
            continue;
        }
        if (line.trim() === '') {
            blocks.push(react_1.default.createElement(ink_1.Text, { key: index }, " "));
            continue;
        }
        const inlineRendered = renderInline(line);
        if (inlineRendered) {
            blocks.push(react_1.default.createElement(ink_1.Text, { key: index, wrap: "wrap" }, inlineRendered));
        }
    }
    if (inCodeBlock) {
        flushCodeBlock('code-final');
    }
    return react_1.default.createElement(ink_1.Box, { flexDirection: "column" }, blocks);
}
