import fs from 'fs';

export class Section {
	name: string;
	constructor(name: string) {
		this.name = name;
	}

	forEach(cb:(valueName: string, value: boolean | number | string, description: string | null)=>void) {
		for (let optionName of this.indexes)
			cb(optionName, this.getValue(optionName) ?? "", this.getDescription(optionName));
	}

	addValue(key: string, value: boolean | number | string, description?: string | null) {
		if (!this.indexes.includes(key)) {
			this.indexes.push(key);
			this.setDefaultValue(key, value);
			this.setDescription(key, description);
		}
		return this.setValue(key, value);
	}

	setValue(key: string, v: boolean | number | string | undefined | null) {
		var value: boolean | number | string = v ?? this.defaultValues.get(key)!;
		switch(typeof value) {
			case "boolean":
				this.number.delete(key);
				this.string.delete(key);
				this.boolean.set(key, value as boolean);
				break;
			case "number":
				this.boolean.delete(key);
				this.string.delete(key);
				this.number.set(key, value as number);
				break;
			case "string":
				this.boolean.delete(key);
				this.number.delete(key);
				this.string.set(key, value as string);
				break;
		}
		return this;
	}

	getValue<T extends boolean | number | string>(key: string): T | null {
		return (this.boolean.get(key) ?? this.number.get(key) ?? this.string.get(key) ?? null) as T | null;
	}

	removeValue(key: string) {
		if (!this.indexes.includes(key)) return false;
		this.indexes.splice(this.indexes.indexOf(key), 1);
		this.boolean.delete(key);
		this.number.delete(key);
		this.string.delete(key);
		this.descriptions.delete(key);
		this.defaultValues.delete(key);
		return true;
	}

	setDescription(key: string, description: string | undefined | null) {
		if (this.indexes.includes(key))
			this.descriptions.set(key, description ?? null);
		return this;
	}
	getDescription(key: string): string | null {
		if (!this.indexes.includes(key)) return null;
		return this.descriptions.get(key) ?? null;
	}

	setDefaultValue(key: string, defaultValue: boolean | number | string) {
		if (this.indexes.includes(key))
			this.defaultValues.set(key, defaultValue);
		else
			this.addValue(key, defaultValue);
		return this;
	}
	getDefaultValue<T extends boolean | number | string>(key: string): T | null {
		return (this.defaultValues.get(key) ?? null) as T | null;
	}

	indexes: string[] = [];
	private boolean: Map<string, boolean> = new Map();
	private number: Map<string, number> = new Map();
	private string: Map<string, string> = new Map();
	private descriptions: Map<string, string | null> = new Map();
	private defaultValues: Map<string, boolean | number | string> = new Map();
}

/*
[ExampleSection]
ExampleParameter=
ExampleParameter1=ExampleValue1
ExampleParameter2="Example"Value"2"
# comment here
; comment here
*/
export class INI {
	DEFAULT_SECTION = ";default;";

	sections: Map<string, Section> = new Map();
	header: string | null = null;

	constructor(DEFAULT_SECTION?: string) {
		if (DEFAULT_SECTION != null) this.DEFAULT_SECTION = DEFAULT_SECTION;

		this.addSection(this.DEFAULT_SECTION);
	}

	addSection(section: string | Section) {
		if (section instanceof Section) return section;
		var sect = this.sections.get(section);
		if (sect == null) {
			sect = new Section(section);
			this.sections.set(section, sect);
		}
		return sect;
	}

	deleteSection(section: string | Section) {
		const sect = this.getSection(section);
		return this.sections.delete(sect.name);
	}

	/** @param section If `null` then uses default section */
	getSection(section?: string | Section | null) {
		if (section instanceof Section) return section;
		section ??= this.DEFAULT_SECTION;
		this.addSection(section);
		return this.sections.get(section)!;
	}

	save(fileName: string) {
		fs.writeFileSync(fileName, this.toString());
	}

	fromString(data: string): INI {
		data = data.replaceAll('\r\n', '\n');
		this.header = data.split('\n')[0];
		if (!this.header.startsWith('INI')) this.header = null;
		else data = data.substring(this.header.length, data.length);

		var inBracketValue = false;

		var inSection = false;
		var inOption = false;
		var inValue = false;

		var curBracket = '';

		var section = this.DEFAULT_SECTION;
		var option = "";
		var value = "";

		var sections: Map<string, Map<string, string>> = new Map();
		sections.set(section, new Map());
		const dataSplit = data.split('');
		for (let [i, char] of dataSplit.entries()) {
			if (!inBracketValue && (char == "'" || char == '"')) {
				curBracket = char;
				inBracketValue = true;
				continue;
			}
			if (!inBracketValue) {
				if (char == '#' || char == ';') {
					inSection = false;
					if (inValue)
						sections.get(section)!.set(option, value);
					inOption = false;
					inValue = false;
				}
				else if (char == '[') {
					inSection = true;
					section = "";
					inOption = false;
					inValue = false;
				}
				else if (char == ']') {
					inSection = false;
					inOption = true;
					option = "";
					inValue = false;
				}
				else if (char == '\n') {
					inSection = false;
					if (inValue) {
						let v = sections.get(section) ?? null;
						if (v == null) {
							v = new Map();
							sections.set(section, v);
						}
						v.set(option, value);
					}
					inOption = true;
					option = "";
					inValue = false;
				}
				else if (char == '=') {
					inSection = false;
					inOption = false;
					inValue = true;
					value = "";
				} else if (inSection)
					section += char;
				else if (inOption)
					option += char;
				else if (inValue) {
					value += char;
					if (i == dataSplit.length - 1)
						sections.get(section)!.set(option, value);
				}

				//console.log("'" + char + "' | '" + section + "' | '" + option + "' | '" + value + "'", [inBracketValue, inSection, inOption, inValue]);
				continue;
			}

			if (char == curBracket) {
				inBracketValue = false;
				curBracket = '';
			}
			if (inBracketValue)
				value += char;

			//console.log("'" + char + "' | '" + section + "' | '" + option + "' | '" + value + "'", [inBracketValue, inSection, inOption, inValue]);
		}

		function getValue(v: string, defaultValue: boolean | number | string | null): boolean | number | string {
			var value: boolean | number | string = v;
			switch(typeof defaultValue) {
				case "boolean": return v == 'true';
				case "number": return parseFloat(v);
			}

			if (v.match("[^0-9]") == null) return parseFloat(v);
			if (v == 'true') return true;
			if (v == 'false') return false;

			return value;
		}
		for (let [sectionName, values] of sections) {
			for (let [optionName, value] of values) {
				const sect = this.getSection(sectionName);
				sect.addValue(optionName, getValue(value, sect.getDefaultValue(option)));
				//console.log("'" + sectionName + "' | '" + optionName + "' | '" + value + "'");
			}
		}

		return this;
	}

	toString(): string {
		var out = "";
		if (this.header != null)
			out += this.header + "\n\n";

		for (let [sectionName, section] of this.sections) {
			if (sectionName != this.DEFAULT_SECTION && section.indexes.length > 0) out += `\n[${sectionName}]\n`;
			section.forEach((valueName, value, description) => {
				if (description != null) out += `# ${description}\n`;
				out += `${valueName}=${value}\n`;
			});
		}
		return out;
	}
}