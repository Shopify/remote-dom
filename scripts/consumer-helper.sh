#!/bin/sh

AVAILABLE_PACKAGES=('remote-ui-core' 'remote-ui-react' 'remote-ui-rpc' 'remote-ui-types')
ROOT=$(pwd)

# Font color
ORANGE='\033[1;31m'
GREEN='\033[0;32m'
NONE='\033[0m'

# Font styles
DIM='\033[2m'
BOLD=$(tput bold)
NORMAL=$(tput sgr0)

projectDirectory=$1
packageName=$2
packages=()
debug=0

# Validation - project
function validate_project {
  local command=$1
  if [[ -z "$projectDirectory" ]]; then
    err "A target project directory is required: ${BOLD}$command${NORMAL}"
    exit 0
  fi

  local targetDir=$(resolve "$ROOT/../$projectDirectory")
  if [[ ! -d $targetDir ]]; then
    err "Project ${BOLD}$projectDirectory${NORMAL} not found in $targetDir"
    exit 0
  fi

  echo "Target project: ${ORANGE}$projectDirectory${NONE}"
}

# Validation - package names
function validate_package {
  if [[ $packageName == '-'* ]]; then
    unset packageName
  fi

  if [[ -z "$packageName" ]]; then
    packages=("${AVAILABLE_PACKAGES[@]}")
  else
    packages=($packageName)

    if [[ ! ${AVAILABLE_PACKAGES[*]} =~ "$packageName" ]]; then
      local availablePackageNames=$(IFS=','; echo "${AVAILABLE_PACKAGES[*]}")
      err "${BOLD}$packageName${NORMAL} is not a valid package. Available packages: ${BOLD}$availablePackageNames${NORMAL}"
      exit 0
    fi
  fi

  echo "Source package(s): ${ORANGE}${packages[@]}${NONE}"
}

function err() {
  echo "❌ $@" >&2
}

function debug() {
  local debug=$1
  local msg=$2

  if [[ "$debug" = 1 ]]; then
    echo "${DIM}$ $msg${NORMAL}"
  fi
}

# Convert a relative path to an absolute path. Does not check if resolved path exist.
#
# Input:
# $1 - path to resolve
#
# Output:
# absolute path with `.` and `..` resolved
function resolve() {
  local path="$1"

  # make sure the string isn't empty
  if [ -z "$path" ]; then
    return 0
  fi

  # resolve the path
  local segments=()
  local resolvedSegments=()

  bkpIFS="$IFS"
  IFS='/' read -r -a segments <<< "$path"
  IFS="$bkpIFS"
  
  for segment in "${segments[@]}"; do
    if [[ ( "$segment" = "" && ${#resolvedSegments[@]} > 0 ) || "$segment" = "." ]]; then continue; fi
    if [[ "$segment" = ".." ]]; then
      unset 'resolvedSegments[${#resolvedSegments[@]}-1]'
      continue
    fi
    resolvedSegments+=("$segment")
  done

  # output the absolute path
  echo $(IFS='/'; echo "${resolvedSegments[*]}")
	
  return 1
}
