# Linux Packaging Workflows Review

**Date:** 2025-11-13
**Branch:** `linux-development` (fork: PythonTilk/hyprnote)
**Reviewer:** OpenCode AI

## Executive Summary

All three Linux packaging workflows have been reviewed for syntax, configuration, and potential issues before publishing to the main repository.

### Status Overview

| Workflow | YAML Valid | Configuration | Test Status | Ready to Publish |
|----------|------------|---------------|-------------|------------------|
| `linux_packages.yaml` | ✅ Valid | ⚠️ Minor issues | ❌ Not tested | ⚠️ Needs testing |
| `linux_packages_rpm.yaml` | ✅ Valid | ✅ Good | ❌ Not tested | ⚠️ Needs testing |
| `linux_packages_arch.yaml` | ✅ Valid | ⚠️ Issues found | ❌ **FAILED** | ❌ **Needs fixes** |

## Detailed Findings

### 1. `linux_packages.yaml` - Debian/Ubuntu & AppImage

**YAML Syntax:** ✅ Valid

**Issues Found:**

1. **Minor Issue - Silent Failures (Line 111)**
   ```yaml
   libopenblas-dev:arm64 || true
   ```
   - **Severity:** Low
   - **Impact:** ARM64 cross-compilation dependencies might fail silently
   - **Recommendation:** Remove `|| true` and handle errors explicitly
   - **Fix:** Check if ARM64 libraries are actually required or optional

2. **Configuration Check Needed**
   - Tauri config path: `./src-tauri/tauri.conf.{stable|nightly}.json`
   - **Note:** This path is relative to the workspace when using `pnpm -F desktop`
   - **Status:** Matches `desktop_cd.yaml` pattern - likely correct but untested

**Positive Aspects:**
- Comprehensive testing for x86_64 builds (installation test)
- ARM64 package verification without requiring native execution
- Good error handling in most steps
- Clear separation of DEB and AppImage jobs

**Recommendation:** ⚠️ **Test before publishing** - Remove silent failure handlers

---

### 2. `linux_packages_rpm.yaml` - Fedora/RHEL

**YAML Syntax:** ✅ Valid

**Issues Found:** None

**Configuration:**
- Uses Fedora 40 container - ✅ Good choice (recent, stable)
- Cross-compilation setup for ARM64 - ✅ Properly configured
- All dependencies explicitly listed - ✅ Good
- Error handling - ✅ Explicit, no silent failures

**Positive Aspects:**
- Cleanest workflow of the three
- Native Fedora container for authentic RPM building
- Good test coverage (x86_64 installation test)
- ARM64 verification using rpm2cpio

**Recommendation:** ✅ **Ready to test** - No blocking issues found

---

### 3. `linux_packages_arch.yaml` - Arch Linux

**YAML Syntax:** ✅ Valid

**Issues Found:**

1. **Critical - Workflow Failed on Fork**
   - **Run ID:** 19327850824
   - **URL:** https://github.com/PythonTilk/hyprnote/actions/runs/19327850824
   - **Failed Step:** "Build in Arch Linux container" (Step 6)
   - **Status:** ❌ Build failed after 4 minutes
   - **Logs:** Available only on fork (cannot access via API)

2. **Potential Root Causes:**
   - Docker build timeout or resource constraints
   - Missing dependencies in Arch container
   - Network issues during package installation
   - Build script error in embedded heredoc

3. **ARM64 Temporarily Disabled**
   - Lines 46-51 commented out with TODO
   - **Reason:** `archlinux:latest` Docker image doesn't support ARM64
   - **Status:** Documented limitation from previous session

**Configuration Analysis:**
- Uses Docker-based approach (differs from RPM's container approach)
- Embeds entire build script in YAML (lines 83-237)
- Complex setup with non-root builder user for makepkg
- All environment variables properly passed to container

**Recommendation:** ❌ **Requires investigation and fix**
- Must diagnose and fix the build failure before publishing
- Consider simplifying the embedded script
- May need to increase timeout or resources

---

## Testing Plan

### Prerequisites
Before testing, these workflows need to be:
1. Pushed to a branch on the main repository (fastrepl/hyprnote)
2. Branch must be accessible for workflow_dispatch triggers

### Recommended Testing Order

1. **Test RPM workflow first** (most stable)
   ```bash
   gh workflow run linux_packages_rpm.yaml --ref linux-development -f channel=nightly
   ```

2. **Test DEB/AppImage workflow second**
   ```bash
   gh workflow run linux_packages.yaml --ref linux-development -f channel=nightly
   ```

3. **Fix and test Arch workflow last**
   - First: Investigate failure on fork
   - Fix: Apply necessary corrections
   - Test: Run workflow_dispatch

### Test Validation Checklist

For each workflow run:
- [ ] All jobs complete successfully
- [ ] x86_64 packages are created
- [ ] ARM64 packages are created (where enabled)
- [ ] Installation tests pass (x86_64)
- [ ] Package verification passes (ARM64)
- [ ] Artifacts are uploaded
- [ ] Build time is reasonable (<60 minutes)

---

## Issues Requiring Attention

### Priority: Critical

1. **Arch workflow failure**
   - **Action:** Investigate Run #19327850824 failure logs on fork
   - **Timeline:** Before publishing
   - **Owner:** Developer with fork access

### Priority: High

2. **Test all workflows before merge**
   - **Action:** Run workflow_dispatch for all three workflows
   - **Timeline:** Before merging to main branch
   - **Requirements:** Workflows must exist on remote branch

3. **Remove silent failure handlers**
   - **File:** `linux_packages.yaml` line 111
   - **Action:** Replace `|| true` with explicit error handling
   - **Timeline:** Before publishing

### Priority: Medium

4. **ARM64 support for Arch Linux**
   - **Current:** Disabled (lines 46-51 in linux_packages_arch.yaml)
   - **Action:** Research alternative approaches (cross-compilation, custom Docker image)
   - **Timeline:** Future enhancement (documented as TODO)

---

## Recommendations for Publishing

### Before Merging to Main Branch:

1. ✅ **YAML validation** - DONE (all valid)
2. ❌ **Fix Arch workflow failure** - REQUIRED
3. ❌ **Test all workflows** - REQUIRED
4. ⚠️ **Remove silent failures** - RECOMMENDED
5. ⚠️ **Update README_linux_packages.md** - Optional (already comprehensive)

### Merge Strategy:

**Option A: Incremental Merge (Recommended)**
1. Merge RPM workflow first (most stable)
2. Test in production
3. Merge DEB/AppImage workflow second
4. Test in production
5. Fix Arch workflow, then merge last

**Option B: All at Once**
1. Fix all issues
2. Test all workflows on fork
3. Merge entire feature branch
4. Cross fingers

**Recommendation:** Use Option A for lower risk

### Post-Merge Actions:

1. Tag the merge commit
2. Monitor first automated release
3. Test installed packages on real systems
4. Gather community feedback
5. Iterate on improvements

---

## Technical Debt / Future Improvements

1. **Refactor Arch workflow**
   - Extract build script to separate file instead of heredoc
   - Simplify Docker approach
   - Consider using GitHub Actions container directly (like RPM)

2. **Unified testing approach**
   - Create reusable test action for all package types
   - Standardize verification steps

3. **ARM64 testing**
   - Explore GitHub ARM64 runners (when available)
   - Add native ARM64 testing instead of just verification

4. **Caching**
   - Add Rust cargo cache
   - Add pnpm cache
   - Cache protoc download

5. **Flatpak support**
   - Complete Flathub application process
   - Enable commented-out Flatpak job

---

## Conclusion

Two of three workflows (DEB/AppImage and RPM) are in good shape and ready for testing. The Arch workflow has a critical failure that must be investigated and fixed before publishing.

**Next Steps:**
1. Investigate Arch workflow failure logs
2. Apply fixes to all identified issues
3. Test workflows via workflow_dispatch
4. Publish to main branch after successful testing

**Estimated Time to Production:**
- RPM workflow: Ready to test (0-2 hours of testing)
- DEB/AppImage workflow: Minor fixes + testing (2-4 hours)
- Arch workflow: Investigation + fixes + testing (4-8 hours)

**Total:** 6-14 hours of work before production-ready
