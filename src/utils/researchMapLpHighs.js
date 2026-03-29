/**
 * Build a CPLEX .lp string from a javascript-lp-solver JSON model and solve it with HiGHS.
 * Shape matches {@link https://github.com/JWally/jsLPSolver | javascript-lp-solver} input
 * used by d3-dag coordSimplex (optimize / opType / variables / constraints).
 *
 * @param {*} highs Loaded HiGHS module (`await import('highs')()`)
 * @param {string} optimize objective column key (e.g. "opt")
 * @param {"min"|"max"} opType
 * @param {Record<string, Record<string, number>>} variables
 * @param {Record<string, { min?: number, max?: number, equal?: number }>} constraints
 * @param {Record<string, unknown>} [solverOptions] HiGHS options (e.g. presolve)
 * @returns {Record<string, number>} sparse assignment (non-zero vars only), like jsLPSolver
 */
export function solveJsLpModelWithHighs(highs, optimize, opType, variables, constraints, solverOptions = {}) {
  if (opType !== 'min') {
    throw new Error(`researchMapLpHighs: only opType "min" is supported (got ${opType})`)
  }

  const varIds = Object.keys(variables)
  const conIds = Object.keys(constraints)
  /** @type {Map<string, string>} */
  const vName = new Map()
  for (let i = 0; i < varIds.length; i++) {
    vName.set(varIds[i], `v${i}`)
  }
  /** @type {Map<string, string>} */
  const cName = new Map()
  let c = 0
  for (const id of conIds) {
    const row = constraints[id]
    if (row.equal !== undefined) {
      cName.set(`${id}\0eq_lo`, `c${c++}`)
      cName.set(`${id}\0eq_hi`, `c${c++}`)
    } else {
      if (row.min !== undefined) cName.set(`${id}\0min`, `c${c++}`)
      if (row.max !== undefined) cName.set(`${id}\0max`, `c${c++}`)
    }
  }

  /** Sparse: constraint id -> nonzero terms (coord models are sparse; avoid O(rows×cols) scans). */
  /** @type {Map<string, { coef: number, name: string }[]>} */
  const termsByConstraint = new Map()
  /** Objective row built in the same pass as matrix terms (one fewer full scan of `variables`). */
  /** @type {{ coef: number, name: string }[]} */
  const objectiveParts = []
  for (let vi = 0; vi < varIds.length; vi++) {
    const vid = varIds[vi]
    const vrow = variables[vid]
    const colName = vName.get(vid)
    const objCoef = vrow[optimize]
    if (objCoef != null && objCoef !== 0) {
      objectiveParts.push({ coef: objCoef, name: colName })
    }
    for (const ckey in vrow) {
      if (ckey === optimize) continue
      const coef = vrow[ckey]
      if (coef == null || coef === 0) continue
      let list = termsByConstraint.get(ckey)
      if (!list) {
        list = []
        termsByConstraint.set(ckey, list)
      }
      list.push({ coef, name: colName })
    }
  }

  function pushObjective(lines) {
    lines.push('Minimize')
    lines.push(` obj: ${formatLinearExpr(objectiveParts) || '0'}`)
  }

  function pushConstraints(lines) {
    lines.push('Subject To')
    for (const cid of conIds) {
      const row = constraints[cid]
      const parts = termsByConstraint.get(cid) ?? []
      const lhs = formatLinearExpr(parts)
      if (row.equal !== undefined) {
        const nLo = cName.get(`${cid}\0eq_lo`)
        const nHi = cName.get(`${cid}\0eq_hi`)
        lines.push(` ${nLo}: ${lhs} >= ${row.equal}`)
        lines.push(` ${nHi}: ${lhs} <= ${row.equal}`)
      } else {
        if (row.min !== undefined) {
          lines.push(` ${cName.get(`${cid}\0min`)}: ${lhs} >= ${row.min}`)
        }
        if (row.max !== undefined) {
          lines.push(` ${cName.get(`${cid}\0max`)}: ${lhs} <= ${row.max}`)
        }
      }
    }
  }

  const lines = []
  pushObjective(lines)
  pushConstraints(lines)
  lines.push('End')

  const lp = `${lines.join('\n')}\n`
  // highs-js reads the textual solution stream; `log_to_console: false` breaks parsing (too few lines).
  const sol = highs.solve(lp, solverOptions)

  if (sol.Status !== 'Optimal') {
    const err = new Error(`could not find a feasible simplex solution (HiGHS status: ${sol.Status})`)
    err.highsStatus = sol.Status
    throw err
  }

  /** @type {Record<string, number>} */
  const assignment = {}
  for (let i = 0; i < varIds.length; i++) {
    const vid = varIds[i]
    const col = sol.Columns[`v${i}`]
    const primal = col?.Primal ?? 0
    if (primal !== 0) {
      assignment[vid] = primal
    }
  }
  return assignment
}

/**
 * @param {{ coef: number, name: string }[]} terms
 */
function formatLinearExpr(terms) {
  if (terms.length === 0) return ''
  const out = []
  for (let i = 0; i < terms.length; i++) {
    const { coef, name } = terms[i]
    if (coef === 0) continue
    if (i === 0) {
      out.push(coef === 1 ? name : coef === -1 ? `- ${name}` : `${coef} ${name}`)
    } else if (coef > 0) {
      out.push(coef === 1 ? `+ ${name}` : `+ ${coef} ${name}`)
    } else {
      out.push(coef === -1 ? `- ${name}` : `- ${Math.abs(coef)} ${name}`)
    }
  }
  return out.join(' ')
}
