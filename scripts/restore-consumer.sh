#!/bin/sh

. "$PWD/scripts/consumer-helper.sh"

usage="
Usage: $(basename "$0") <target_project>

Restore a project by removing Shopify Remote UI packages and running \`yarn install\`

 Options:
  -h, --help    Show this help text
  -t, --target  Set target project
  -d, --debug   Output messages for debugging"

# Get Options
while [[ "$#" > 0 ]]; do case $1 in
  -h|--help) echo "$usage"; exit;;
  -t|--target) projectDirectory=$1; shift;;
  -d|--debug) debug=1; shift;;
esac; shift; done

echo "💃 ${BOLD}Running restore-consumer...${NORMAL}"

validate_project '`dev restore-consumer PROJECT_DIRECTORY`'

for package in "${AVAILABLE_PACKAGES[@]}"; do
  packageDir="$ROOT/packages/$package"
  projectDir=$(resolve "$ROOT/../$projectDirectory")
  targetDir="$projectDir/node_modules/@shopify/$package"

  if [[ -d "$targetDir" ]]; then
    echo "🗑️  Cleaning up package ${ORANGE}$package${NONE}..."
    debug $debug "rm -rf $targetDir"

    rm -rf $targetDir
  fi

done

if [[ -d "$projectDir" ]]; then
  debug $debug "cd $projectDir"

  cd $projectDir

  echo "Running \`yarn install\` from $projectDir"
  
  installCmd="yarn install --force --ignore-engines"
  if [[ "$debug" = 0 ]]; then installCmd+=" 2>/dev/null"; fi

  debug $debug "$installCmd"

  eval $installCmd
fi

echo "💃 ${GREEN}Project ${BOLD}$projectDirectory${NORMAL} ${GREEN}restored.${NONE}"

exit 0