// ==== Template parser ====
export const templateParser_regex = /{{%=([0-9]+)%/g;
export const templateParser_regex_split = /{{%=[0-9]+%/g;
export const REF_DIRECT = 0, REF_IF = 1, REF_EXEC = 2;

export const ModelInternal = {};