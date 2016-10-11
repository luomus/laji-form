#!/bin/bash
# Since we need to manually merge react-jsonschema-form changes,
# this script is handy for generating the git diff files which
# can be applied after pulling a newer react-jsonschema-form
# version.
#
# BEFORE RUNNING:
# 1. Checkout react-jsonschema-form to the version that laji-form is currently using, so you get the correct diffs.
# 2. Point $REACT_FORM_DIR to the correct directory.
#    (eg. run this script with 'REACT_FORM_DIR=~/programming/react-jsonschema-form ./generate-diffs.sh')

if ! [[ -d $REACT_FORM_DIR ]]; then
	echo '$REACT_FORM_DIR' wasn\'t valid path
	exit
fi

LAJI_FORM_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LAJI_FORM_OVERRIDDEN=$LAJI_FORM_DIR"/src/overriddenComponents"
DIFF_DIR=$LAJI_FORM_DIR/diff
COPYS_DIR_NAME="react-jsonschema-form-copys"
COPYS_DIR=$LAJI_FORM_DIR/$COPYS_DIR_NAME

[[ -d $DIFF_DIR ]] || mkdir $DIFF_DIR
[[ -d $COPYS_DIR ]] || mkdir $COPYS_DIR

function fix_git_pointers() {
	diff_file="$1"
	to_replace="$2"
	replace_with="$3"

	grep -n $to_replace $diff_file | while read n_colon_line; do
		line_number=$(echo $n_colon_line | awk -F ':' '{print $1}')
		orig_line=$(echo $n_colon_line | awk -F ':' '{print $2}')
		line="${orig_line/$to_replace/"./"$replace_with"/"}"
		sed -i "$line_number s@.*@$line@" $diff_file
	done
}

find $LAJI_FORM_OVERRIDDEN/* -type f | while read file; do
	relative_file=${file#$LAJI_FORM_OVERRIDDEN/}
	relative_file_to_components=/src/components/$relative_file
	react_jsonschema_file="$REACT_FORM_DIR$relative_file_to_components"

	file_name=$(basename $file)

	cp $react_jsonschema_file $COPYS_DIR/
	copy=$COPYS_DIR/$file_name
	unexpand -t 2 --first-only $react_jsonschema_file > $copy # react-jsonschema-form uses 2 spaces for indentation.

	diff_file=$DIFF_DIR/diff_$file_name.diff

	git diff --no-index $copy $file > $diff_file

	echo $diff_file
	# fix git file pointers
	fix_git_pointers $diff_file $LAJI_FORM_OVERRIDDEN/ src/overriddenComponents
	fix_git_pointers $diff_file $COPYS_DIR/ $COPYS_DIR_NAME
done

rm -rf $COPYS_DIR

echo ""
echo "Generated diff files to $DIFF_DIR/"
echo "Generated react-jsonschema-form whitespace-fixed files for git applying to $COPYS_DIR_NAME/"
