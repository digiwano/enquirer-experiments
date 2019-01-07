"use strict";

const lib = (enq, libopts = {}, inject = {}) => {
  const Table = inject.Table || require("cli-table-redemption");
  const chalk = inject.Chalk || require("chalk");
  const $ = inject.syms || require("syms");
  const deeps = inject.deeps || require("deeps");

  const Y = inject.Y || chalk.dim.cyan("•");
  const N = inject.N || chalk.red(" ");
  const YY = inject.YY || chalk.bold.green("✔");
  const NN = inject.NN || chalk.red("✘");
  const bval = (x, a, b) => typeof x === "boolean" && (x ? a : b);
  const isAbsent = val => val === null || typeof val === "undefined";
  const boldify = str => str.replace(/(\*[^\*]+\*)/g, (m0, m1) => chalk.bold(m1));

  const renderPointy = issel => (issel ? chalk.cyan.bold("➤") : "");

  const renderCellSel = entry => bval(entry, YY, NN) || chalk.cyan(boldify(entry));

  const renderCellPlain = entry => bval(entry, Y, N) || boldify(entry);

  const renderRow = (row, issel) => [
    renderPointy(issel),
    ...row.map(issel ? renderCellSel : renderCellPlain),
  ];
  const _seemsLikeEnq = t =>
    !!(
      t.name === "Enquirer" &&
      "Prompt" in t &&
      typeof t.Prompt === "function" &&
      t.Prompt.name === "Prompt"
    );
  const _pclass = t => (_seemsLikeEnq(t) ? t.Prompt : t);

  const TABLE_CHARS = "top top-mid top-left top-right bottom bottom-mid bottom-left bottom-right left left-mid mid-mid right right-mid middle"
    .split(" ")
    .reduce((m, x) => ({ ...m, [x]: "" }), { mid: "━" });

  const mktbl = (headers, rows, compact) => {
    const table = new Table({
      head: ["", ...headers],
      style: { compact, head: ["cyan", "bold"] },
      ...(compact ? { chars: TABLE_CHARS } : {}),
    });
    table.push(...rows);
    return table.toString();
  };

  const renderTable = (t, headers, rows$, compact, sel = -1) => {
    const rows = JSON.parse(JSON.stringify(rows$)); // copy/naive-clone data
    for (const [index, row] of Object.entries(rows))
      rows[index] = renderRow(row, Number(index) === sel);
    return mktbl(headers, rows, compact);
  };

  const { Prompt } = enq.constructor;
  const TableSelect = class extends Prompt {
    constructor(...a) {
      super(...a);
      const [options] = a;
      this[$.current] = options.initial || 0;
      this.cursorHide();
      this[$.compact] = !!options.compact;
      this[$.message] = options.message || "Select one";
      if ("fields" in options) {
        const fields = options.fields.map(x => (typeof x === "string" ? { key: x, label: x } : x));
        this[$.choices] = options.choices;
        this[$.headers] = fields.map(x => x.label);
        this[$.rows] = this[$.choices].map(row =>
          fields.map(col => {
            const val = deeps.get(row, col.key);
            if (isAbsent(val)) return col.absent || `${val}`;
            return val;
          })
        );
      } else if ("headers" in options) {
        this[$.headers] = options.headers;
        this[$.rows] = options.choices;
      } else {
        throw new Error(
          `either \`headers\` or \`fields\` must be defined for ${this.name} (${this.type})`
        );
      }
    }

    up() {
      this[$.current] = Math.max(0, this[$.current] - 1);
      return this.render();
    }

    down() {
      this[$.current] = Math.min(this[$.rows].length - 1, this[$.current] + 1);
      return this.render();
    }

    async submit() {
      this.value = {
        index: this[$.current],
        // row: this[$.rows][this[$.current]],
        ...(this[$.choices] ? { choice: this[$.choices][this[$.current]] } : {}),
      };
      return await super.submit();
    }

    async render() {
      const msg = chalk.cyan.bold(`${this[$.message]}: \n`);
      const tbl = renderTable(
        this,
        this[$.headers],
        this[$.rows],
        this[$.compact],
        this[$.current]
      );
      this.clear();
      this.write(`${msg + tbl}\n`);
    }
  };

  enq.register(libopts.tsname || "tableselect", TableSelect);
};
module.exports = lib;
