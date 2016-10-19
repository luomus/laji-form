#!/bin/bash
# Since we need to manually merge react-jsonschema-form changes,
# this script is handy for copying relevant files from 
# react-jsonschema-form to src/overriddenComponents.
# BEFORE RUNNING:
# 1. Checkout react-jsonschema-form to the version that you are going to update to.
# 2. Point $REACT_FORM_DIR to the correct directory.
#    (eg. run this script with 'REACT_FORM_DIR=~/programming/react-jsonschema-form ./copy-react-jsonschema-form-files.sh')

if ! [[ -d $REACT_FORM_DIR ]]; then
	echo '$REACT_FORM_DIR' wasn\'t valid path
	exit
fi

LAJI_FORM_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LAJI_FORM_PREFIX=$LAJI_FORM_DIR"/src/overriddenComponents/"
COPY_DIR=$LAJI_FORM_DIR/react-jsonschema-form-copys

[[ -d $COPY_DIR ]] || mkdir $COPY_DIR

find $LAJI_FORM_DIR/src/overriddenComponents/* -type f | while read file; do
	relative_file_to_components=${file#$LAJI_FORM_PREFIX}
	react_jsonschema_file="$REACT_FORM_DIR/src/components/$relative_file_to_components"

	file_name=$(basename $file)

	unexpand --first-only -t 2 $react_jsonschema_file > $COPY_DIR/$file_name # react-jsonschema-form uses 2 spaces for indentation.
done
