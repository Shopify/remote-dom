#!/bin/sh

. "$PWD/scripts/consumer-helper.sh"

usage="
Usage: $(basename "$0") <target_project> [<package_name>]

Build Shopify Remove UI packages into a project

 <target_project>  Target project i.e. \`app-extension-libs\`
 <package_name>    Space separated package names
                   default: ${AVAILABLE_PACKAGES[@]}

 Options:
  -h, --help       Show this help text
  -d, --debug      Output messages for debugging"

# Get Options
options_counter=0
while [[ $# > 0 ]]; do
  options_counter=$(( options_counter+1 ))
  if (( $options_counter >= 3 )) && [[ $1 != '-'* ]]; then
    packageName="$packageName $1"; shift
  fi
  case $1 in
    -h|--help) echo "$usage"; exit;;
    -d|--debug) debug=1; shift;;
  esac
  shift
done

echo "💃 ${BOLD}Running build-consumer...${NORMAL}"

validate_project '`dev build-consumer PROJECT_DIRECTORY`'
validate_package "$packageName"

for package in "${packages[@]}"; do
  packageDir="$ROOT/packages/$package"
  targetDir=$(resolve "$ROOT/../$projectDirectory/node_modules/@shopify/$package")
  packageFile="shopify-$package-latest.tgz"

  echo "Processing ${ORANGE}$package${NONE}:"

  if [[ -d $packageDir ]]; then
    debug $debug "cd $packageDir"

    cd $packageDir

    packCmd="yarn pack --filename $packageFile"
    
    if [[ $debug = 0 ]]; then
      buildCmd+=" > /dev/null"
      packCmd+=" > /dev/null"
    fi

    echo "${DIM}[1/3]${NORMAL} 🏗  Building package..."
    debug $debug "$buildCmd"
    eval $buildCmd

    if [[ $? != 0 ]]; then
      err "Build failed. Please ensure there are no errors in the package."
      exit 1
    fi

    echo "${DIM}[2/3]${NORMAL} 📦 Packing for transport..."
    debug $debug "$packCmd"
    eval $packCmd
  fi

  if [[ -d "$targetDir" ]]; then
    debug $debug "rm -rf $targetDir"

    rm -rf $targetDir
  fi

  if [[ ! -d "$targetDir" ]]; then
    debug $debug "mkdir $targetDir"

    mkdir -p $targetDir
  fi

  if [[ -d "$targetDir" && -f "$packageFile" ]]; then
    echo "${DIM}[3/3]${NORMAL} 💿 Installing to node_modules..."
    debug $debug "tar xzf $packageFile --strip-components=1 -C $targetDir$targetDir"

    tar xzf $packageFile --strip-components=1 -C $targetDir
    rm -rf "$targetDir/src"
  fi
  
  if [[ -f "$packageFile" ]]; then
    debug $debug "rm $packageFile"

    rm $packageFile
  fi

  echo "💪 Done."

done

echo "💃 ${GREEN}Build copied to ${BOLD}$projectDirectory${NORMAL}.${NONE} Run the project to see your changes from Remote UI."

exit 0