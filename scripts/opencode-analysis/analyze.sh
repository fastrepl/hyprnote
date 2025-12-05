#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANALYSIS_DIR="${REPO_ROOT}/scripts/opencode-analysis"
OUTPUT_DIR="${ANALYSIS_DIR}/output"
MAX_CONCURRENCY=${MAX_CONCURRENCY:-3}

mkdir -p "$OUTPUT_DIR"

TARGETS=(
    "plugins/listener:Audio capture and session management plugin"
    "plugins/local-stt:Local speech-to-text plugin"
    "plugins/db:Database operations plugin"
    "plugins/windows:Window management plugin"
    "crates/audio:Cross-platform audio abstraction"
    "crates/llama:LLM text generation"
    "crates/whisper-local:Local Whisper implementation"
    "crates/db-user:User database schema"
    "apps/desktop/src-tauri:Desktop app Rust backend"
    "apps/desktop/src:Desktop app React frontend"
    "owhisper:Audio transcription actor system"
)

analyze_target() {
    local target="$1"
    local description="$2"
    local target_name="${target//\//_}"
    local output_file="${OUTPUT_DIR}/${target_name}.json"
    local target_path="${REPO_ROOT}/${target}"

    if [[ ! -d "$target_path" ]]; then
        echo "Skipping $target: directory does not exist"
        return 0
    fi

    echo "Analyzing: $target ($description)"

    local prompt="Analyze the code in this directory for:
1. Potential bugs or error-prone patterns
2. Refactoring opportunities (code duplication, complex functions, etc.)
3. Performance issues
4. Security concerns
5. Missing error handling

Focus on actionable findings that would benefit from a dedicated fix.
For each finding, provide:
- File path and line number(s)
- Severity (critical/high/medium/low)
- Description of the issue
- Suggested fix approach

Output your findings in a structured format."

    cd "$target_path"
    
    if opencode run "$prompt" --agent plan --format json > "$output_file" 2>&1; then
        echo "Completed: $target"
    else
        echo "Failed: $target"
        echo "{\"error\": \"Analysis failed\", \"target\": \"$target\"}" > "$output_file"
    fi
}

export -f analyze_target
export REPO_ROOT OUTPUT_DIR

run_with_concurrency() {
    local running=0
    local pids=()

    for target_entry in "${TARGETS[@]}"; do
        IFS=':' read -r target description <<< "$target_entry"

        while [[ $running -ge $MAX_CONCURRENCY ]]; do
            for i in "${!pids[@]}"; do
                if ! kill -0 "${pids[$i]}" 2>/dev/null; then
                    wait "${pids[$i]}" || true
                    unset 'pids[i]'
                    ((running--))
                fi
            done
            pids=("${pids[@]}")
            sleep 1
        done

        analyze_target "$target" "$description" &
        pids+=($!)
        ((running++))
    done

    for pid in "${pids[@]}"; do
        wait "$pid" || true
    done
}

echo "Starting analysis with max concurrency: $MAX_CONCURRENCY"
echo "Output directory: $OUTPUT_DIR"
echo ""

run_with_concurrency

echo ""
echo "Analysis complete. Results saved to: $OUTPUT_DIR"
