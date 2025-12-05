#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/output"
FINDINGS_FILE="${SCRIPT_DIR}/findings.json"

DEVIN_API_URL="${DEVIN_API_URL:-https://api.devin.ai/v1/sessions}"

parse_findings() {
    echo "Parsing analysis results from: $OUTPUT_DIR"
    
    local findings='{"findings": []}'
    
    for file in "$OUTPUT_DIR"/*.json; do
        if [[ -f "$file" ]]; then
            local target_name=$(basename "$file" .json)
            local content=$(cat "$file")
            
            if echo "$content" | jq -e '.error' > /dev/null 2>&1; then
                echo "Skipping $target_name: analysis failed"
                continue
            fi
            
            findings=$(echo "$findings" | jq --arg target "$target_name" --argjson content "$content" \
                '.findings += [{"target": $target, "analysis": $content}]')
        fi
    done
    
    echo "$findings" > "$FINDINGS_FILE"
    echo "Findings saved to: $FINDINGS_FILE"
}

create_devin_session() {
    local prompt="$1"
    local response
    
    response=$(curl -s -X POST "$DEVIN_API_URL" \
        -H "Authorization: Bearer $DEVIN_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"prompt\": $(echo "$prompt" | jq -Rs .)}")
    
    if echo "$response" | jq -e '.session_id' > /dev/null 2>&1; then
        local session_id=$(echo "$response" | jq -r '.session_id')
        local url=$(echo "$response" | jq -r '.url')
        echo "Created Devin session: $url"
        return 0
    else
        echo "Failed to create session: $response"
        return 1
    fi
}

process_findings() {
    if [[ -z "${DEVIN_API_KEY:-}" ]]; then
        echo "Error: DEVIN_API_KEY environment variable is not set"
        exit 1
    fi

    if [[ ! -f "$FINDINGS_FILE" ]]; then
        echo "No findings file found. Run analyze.sh first."
        exit 1
    fi
    
    local findings=$(cat "$FINDINGS_FILE")
    local count=$(echo "$findings" | jq '.findings | length')
    
    echo "Processing $count analysis results..."
    
    for i in $(seq 0 $((count - 1))); do
        local target=$(echo "$findings" | jq -r ".findings[$i].target")
        local analysis=$(echo "$findings" | jq -r ".findings[$i].analysis")
        
        if [[ -z "$analysis" ]] || [[ "$analysis" == "null" ]]; then
            continue
        fi
        
        local prompt="You are working on the fastrepl/hyprnote repository.

Based on the following code analysis for the '$target' component, please review and fix the identified issues:

$analysis

Instructions:
1. Review each finding carefully
2. Prioritize critical and high severity issues
3. Create a PR with the fixes
4. Run tests to ensure nothing is broken
5. Follow the project's coding conventions (see AGENTS.md)

Repository: fastrepl/hyprnote
Target component: $target"

        echo "Creating Devin session for: $target"
        create_devin_session "$prompt" || true
        
        sleep 2
    done
}

case "${1:-}" in
    parse)
        parse_findings
        ;;
    create)
        process_findings
        ;;
    *)
        echo "Usage: $0 {parse|create}"
        echo ""
        echo "Commands:"
        echo "  parse   - Parse analysis results into findings.json"
        echo "  create  - Create Devin sessions for each finding"
        exit 1
        ;;
esac
