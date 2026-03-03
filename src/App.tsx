import React, { useState, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { Lexer } from "./compiler/lexer";
import { Parser } from "./compiler/parser";
import { Token, TokenType, ParsingStep } from "./compiler/types";
import { 
  Play, 
  Terminal, 
  Table, 
  Code, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Settings2,
  Cpu,
  Layers,
  FileCode2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DEFAULT_LEX_GRAMMAR = `// 3型正规文法示例
ID -> [a-zA-Z][a-zA-Z0-9]*
NUM -> [0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?
COMPLEX -> [0-9]+(\\.[0-9]+)?[+-][0-9]+(\\.[0-9]+)?i
OP -> + | - | * | / | = | ==
DELIM -> ( | ) | { | } | ; | ,`;

const DEFAULT_SYNTAX_GRAMMAR = `E -> E + T | T
T -> T * F | F
F -> ( E ) | id | num`;

const DEFAULT_SOURCE = `int main() {
  float x = 0.314E+1;
  complex z = 10+12i;
  if (x > 0) {
    return x * 2;
  }
  return 0;
}`;

function LRGraph({ parser }: { parser: Parser }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 600;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes: any[] = Array.from({ length: 12 }).map((_, i) => ({ id: i, label: `S${i}` }));
    const links: any[] = [];

    // Extract links from action and goto tables
    parser.actionTable.forEach((actions, from) => {
      actions.forEach((action, symbol) => {
        if (action.type === "SHIFT" && action.value !== undefined) {
          links.push({ source: from, target: action.value, label: symbol });
        }
      });
    });

    parser.gotoTable.forEach((gotos, from) => {
      gotos.forEach((to, symbol) => {
        links.push({ source: from, target: to, label: symbol });
      });
    });

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#141414")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1);

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 15)
      .attr("fill", "#141414")
      .call(d3.drag<SVGCircleElement, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    const label = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .text((d: any) => d.label)
      .attr("font-size", "10px")
      .attr("fill", "#E4E3E0")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em");

    const edgeLabel = svg.append("g")
      .selectAll("text")
      .data(links)
      .enter().append("text")
      .text((d: any) => d.label)
      .attr("font-size", "8px")
      .attr("fill", "#141414")
      .attr("opacity", 0.6);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);

      edgeLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);
    });

    return () => { simulation.stop(); };
  }, [parser]);

  return <svg ref={svgRef} className="w-full h-full" viewBox="0 0 800 600" />;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"lexer" | "parser" | "tables" | "graph">("lexer");
  const [lexGrammar, setLexGrammar] = useState(DEFAULT_LEX_GRAMMAR);
  const [syntaxGrammar, setSyntaxGrammar] = useState(DEFAULT_SYNTAX_GRAMMAR);
  const [sourceCode, setSourceCode] = useState(DEFAULT_SOURCE);
  
  const [tokens, setTokens] = useState<Token[]>([]);
  const [parsingSteps, setParsingSteps] = useState<ParsingStep[]>([]);
  const [parseResult, setParseResult] = useState<{ success: boolean; error?: string } | null>(null);

  const lexer = useMemo(() => new Lexer(), []);
  const parser = useMemo(() => new Parser(syntaxGrammar), [syntaxGrammar]);

  const handleRunLexer = () => {
    const result = lexer.tokenize(sourceCode);
    setTokens(result);
    setActiveTab("lexer");
  };

  const handleRunParser = () => {
    const result = parser.parse(tokens);
    setParsingSteps(result.steps);
    setParseResult({ success: result.success, error: result.error });
    setActiveTab("parser");
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-black/10 p-6 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-ink text-bg p-2 rounded-lg">
            <Cpu size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">编译原理课程设计系统</h1>
            <p className="text-xs opacity-50 font-mono uppercase tracking-widest">v1.0.0 // 实验课</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleRunLexer}
            className="flex items-center gap-2 bg-ink text-bg px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Play size={16} fill="currentColor" />
            运行词法分析
          </button>
          <button 
            onClick={handleRunParser}
            className="flex items-center gap-2 border border-ink/20 px-4 py-2 rounded-full text-sm font-medium hover:bg-ink/5 transition-colors"
          >
            <Layers size={16} />
            运行语法分析
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left Pane: Input */}
        <section className="border-r border-black/10 flex flex-col h-[calc(100vh-88px)]">
          <div className="flex border-b border-black/10">
            <button 
              onClick={() => setActiveTab("lexer")}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest border-b-2 transition-colors ${activeTab === "lexer" ? "border-ink opacity-100" : "border-transparent opacity-40"}`}
            >
              词法文法 (3型)
            </button>
            <button 
              onClick={() => setActiveTab("parser")}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest border-b-2 transition-colors ${activeTab === "parser" ? "border-ink opacity-100" : "border-transparent opacity-40"}`}
            >
              语法文法 (2型)
            </button>
            <button 
              onClick={() => setActiveTab("tables")}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest border-b-2 transition-colors ${activeTab === "tables" ? "border-ink opacity-100" : "border-transparent opacity-40"}`}
            >
              分析表
            </button>
            <button 
              onClick={() => setActiveTab("graph")}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest border-b-2 transition-colors ${activeTab === "graph" ? "border-ink opacity-100" : "border-transparent opacity-40"}`}
            >
              状态图
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 opacity-50">
                  <Settings2 size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-tighter">文法定义规则</span>
                </div>
              </div>
              <textarea 
                className="terminal-input flex-1 w-full text-sm leading-relaxed"
                value={activeTab === "lexer" ? lexGrammar : syntaxGrammar}
                onChange={(e) => activeTab === "lexer" ? setLexGrammar(e.target.value) : setSyntaxGrammar(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className="p-4 flex-1 flex flex-col min-h-0 border-t border-black/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 opacity-50">
                  <FileCode2 size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-tighter">待分析源代码</span>
                </div>
              </div>
              <textarea 
                className="terminal-input flex-1 w-full text-sm leading-relaxed"
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>
        </section>

        {/* Right Pane: Output */}
        <section className="bg-white/30 overflow-y-auto h-[calc(100vh-88px)]">
          <AnimatePresence mode="wait">
            {activeTab === "lexer" ? (
              <motion.div 
                key="lexer-output"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif italic">词法分析结果 (Token 流)</h2>
                  <div className="flex items-center gap-2 text-xs font-mono opacity-50">
                    <Table size={14} />
                    <span>识别到 {tokens.length} 个令牌</span>
                  </div>
                </div>

                <div className="border border-black/10 rounded-lg overflow-hidden bg-white/50">
                  <div className="data-row bg-ink/5 border-b border-black/10">
                    <span className="col-header">行号</span>
                    <span className="col-header">类别</span>
                    <span className="col-header">内容</span>
                    <span className="col-header">状态</span>
                  </div>
                  {tokens.length === 0 ? (
                    <div className="p-12 text-center opacity-30 italic text-sm">
                      暂无数据。点击“运行词法分析”开始。
                    </div>
                  ) : (
                    tokens.map((token, idx) => (
                      <div key={idx} className="data-row">
                        <span className="data-value text-xs opacity-50">{token.line}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                          token.type === TokenType.KEYWORD ? "bg-blue-100 text-blue-700" :
                          token.type === TokenType.IDENTIFIER ? "bg-emerald-100 text-emerald-700" :
                          token.type === TokenType.CONSTANT ? "bg-purple-100 text-purple-700" :
                          token.type === TokenType.OPERATOR ? "bg-amber-100 text-amber-700" :
                          token.type === TokenType.UNKNOWN ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {token.type === TokenType.KEYWORD ? "关键字" :
                           token.type === TokenType.IDENTIFIER ? "标识符" :
                           token.type === TokenType.CONSTANT ? "常量" :
                           token.type === TokenType.OPERATOR ? "运算符" :
                           token.type === TokenType.DELIMITER ? "界符" : "未知"}
                        </span>
                        <span className="data-value font-medium">{token.content}</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold opacity-40">
                          {token.type !== TokenType.UNKNOWN ? (
                            <><CheckCircle2 size={10} className="text-emerald-600" /> 合法</>
                          ) : (
                            <><AlertCircle size={10} className="text-red-600" /> 错误</>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-2 opacity-50">
                    <Settings2 size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">DFA 状态转移说明 (数值常量)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border border-black/10 rounded-lg bg-white/50 text-[10px] font-mono">
                      <p className="font-bold mb-2">科学计数法</p>
                      <ul className="space-y-1 opacity-70">
                        <li>S0: [0-9] {"->"} S1</li>
                        <li>S1: [0-9] {"->"} S1, "." {"->"} S2, "E" {"->"} S4</li>
                        <li>S2: [0-9] {"->"} S3</li>
                        <li>S3: [0-9] {"->"} S3, "E" {"->"} S4</li>
                        <li>S4: [+-] {"->"} S5, [0-9] {"->"} S6</li>
                        <li>S5: [0-9] {"->"} S6</li>
                        <li>S6: [0-9] {"->"} S6 (接受)</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-black/10 rounded-lg bg-white/50 text-[10px] font-mono">
                      <p className="font-bold mb-2">复数常量</p>
                      <ul className="space-y-1 opacity-70">
                        <li>S0: [0-9] {"->"} S1</li>
                        <li>S1: [0-9] {"->"} S1, [+-] {"->"} S7</li>
                        <li>S7: [0-9] {"->"} S8</li>
                        <li>S8: [0-9] {"->"} S8, "i" {"->"} S9</li>
                        <li>S9: (接受)</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-black/10 rounded-lg bg-white/50 text-[10px] font-mono">
                      <p className="font-bold mb-2">标识符</p>
                      <ul className="space-y-1 opacity-70">
                        <li>S0: [a-zA-Z_] {"->"} S10</li>
                        <li>S10: [a-zA-Z0-9_] {"->"} S10 (接受)</li>
                        <li>S0: [0-9] {"->"} 错误 (不能以数字开头)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === "parser" ? (
              <motion.div 
                key="parser-output"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif italic">语法分析结果</h2>
                  {parseResult && (
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold ${
                      parseResult.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {parseResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {parseResult.success ? "YES (符合文法)" : "NO (不符合文法)"}
                    </div>
                  )}
                </div>

                {parseResult?.error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-red-800">
                    <AlertCircle size={20} className="shrink-0" />
                    <div>
                      <p className="font-bold text-sm">语法错误</p>
                      <p className="text-xs opacity-80">{parseResult.error}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-2 opacity-50 mb-2">
                    <Terminal size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">分析过程日志 (LR 归约过程)</span>
                  </div>
                  
                  <div className="bg-ink text-bg/80 p-6 rounded-lg font-mono text-xs space-y-2 min-h-[400px]">
                    {parsingSteps.length === 0 ? (
                      <div className="opacity-30 italic">暂无日志。请运行语法分析以查看中间过程。</div>
                    ) : (
                      parsingSteps.map((step, idx) => (
                        <div key={idx} className="flex gap-4 border-b border-white/5 pb-2">
                          <span className="opacity-30">[{step.step}]</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-emerald-400">动作: {step.action}</span>
                              <span className="opacity-50">剩余输入: {step.input.slice(0, 3).join(" ")}...</span>
                            </div>
                            <div className="opacity-60 overflow-x-auto whitespace-nowrap">
                              状态栈: {step.stack.join(", ")}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {parseResult && (
                      <div className={`pt-4 font-bold ${parseResult.success ? "text-emerald-400" : "text-red-400"}`}>
                        {parseResult.success ? ">> 成功: 输入字符串符合该文法规则。" : ">> 失败: 语法校验未通过。"}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : activeTab === "graph" ? (
              <motion.div 
                key="graph-output"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-serif italic">LR(1) 状态转移图</h2>
                </div>
                <div className="flex-1 bg-white/50 rounded-lg border border-black/10 overflow-hidden relative">
                  <LRGraph parser={parser} />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="tables-output"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif italic">LR(1) Action & Goto 分析表</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-widest opacity-50 mb-4">Action 表 (动作表)</h3>
                    <div className="overflow-x-auto border border-black/10 rounded-lg bg-white/50">
                      <table className="w-full text-[10px] font-mono">
                        <thead>
                          <tr className="bg-ink/5 border-b border-black/10">
                            <th className="p-2 text-left border-r border-black/10">状态</th>
                            {["id", "num", "+", "*", "(", ")", "$"].map(sym => (
                              <th key={sym} className="p-2 text-center border-r border-black/10">{sym}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 12 }).map((_, state) => (
                            <tr key={state} className="border-b border-black/10 last:border-0">
                              <td className="p-2 font-bold bg-ink/5 border-r border-black/10">{state}</td>
                              {["id", "num", "+", "*", "(", ")", "$"].map(sym => {
                                const action = parser.actionTable.get(state)?.get(sym);
                                return (
                                  <td key={sym} className="p-2 text-center border-r border-black/10">
                                    {action ? (
                                      <span className={action.type === "SHIFT" ? "text-blue-600" : action.type === "REDUCE" ? "text-purple-600" : "text-emerald-600 font-bold"}>
                                        {action.type === "SHIFT" ? `s${action.value}` : action.type === "REDUCE" ? `r${action.value}` : "acc"}
                                      </span>
                                    ) : "-"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-widest opacity-50 mb-4">Goto 表 (转移表)</h3>
                    <div className="overflow-x-auto border border-black/10 rounded-lg bg-white/50">
                      <table className="w-full text-[10px] font-mono">
                        <thead>
                          <tr className="bg-ink/5 border-b border-black/10">
                            <th className="p-2 text-left border-r border-black/10">状态</th>
                            {["E", "T", "F"].map(sym => (
                              <th key={sym} className="p-2 text-center border-r border-black/10">{sym}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 12 }).map((_, state) => (
                            <tr key={state} className="border-b border-black/10 last:border-0">
                              <td className="p-2 font-bold bg-ink/5 border-r border-black/10">{state}</td>
                              {["E", "T", "F"].map(sym => {
                                const nextState = parser.gotoTable.get(state)?.get(sym);
                                return (
                                  <td key={sym} className="p-2 text-center border-r border-black/10">
                                    {nextState !== undefined ? nextState : "-"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* 页脚 / 状态栏 */}
      <footer className="border-t border-black/10 bg-white/50 px-6 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest opacity-50">
        <div className="flex gap-6">
          <span>状态: 就绪</span>
          <span>引擎: LR(1) / DFA</span>
        </div>
        <div>
          © 2026 编译原理课程设计系统
        </div>
      </footer>
    </div>
  );
}
