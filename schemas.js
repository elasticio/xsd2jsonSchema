const TYPES_MAP = {
    NormalizedString: 'string',
    DateTime: 'date',
    PositiveInteger: 'number',
    Decimal: 'number',
    Boolean: 'boolean',
    Date: 'date',
    Int: 'number',
    NonNegativeInteger: 'number',
    AnyType: 'string',
    Integer: 'number'
};

let mappings;
let indent = 0;

function lookupType(typeName) {
    const nameParts = typeName.split('.');
    const [module, name] = [nameParts[0], nameParts.splice(1).join('.')];
    return mappings.typeInfos.find((t) => t.localName === name);
}

function convertType(type) {
    if (!type) {
        return 'string';
    }
    let result = TYPES_MAP[type];
    if (!result) {
        const foundType = lookupType(type);
        if (!foundType) {
            throw new Error(`Can't find type ${type}`);
        }
        if (foundType.propertyInfos) {
            result = 'object';
        }
    }
    return result;
}

function toProperties(type) {
    indent++;
    const suffix = new Array(indent + 1).join('\t');
    const props = {};
    // console.log(`${suffix} Processing ${JSON.stringify(type)}`);
    if (!type.propertyInfos) {
        throw new Error(`Type ${type.localName} has no propertyInfos property ${JSON.stringify(type)}`);
    }
    type.propertyInfos.forEach((prop) => {
        const type = convertType(prop.typeInfo);
        const required = prop.required || false;
        const name = prop.name;
        const result = {
            required,
            type
        };
        if (prop.elementName && prop.elementName.localPart) {
            result.title = prop.elementName.localPart;
        }
        if (prop.values) {
            result.enum = prop.values;
        }
        if (type === 'object') {
            if (!prop.typeInfo) {
                throw new Error(`Can not convert prop=${JSON.stringify(prop)}`);
            }
            const subType = lookupType(prop.typeInfo);
            if (!subType) {
                throw new Error(`Can not lookup typeInfo of prop=${JSON.stringify(prop)}`);
            }
            result.properties = toProperties(subType);
        } else if (prop.typeInfo && prop.typeInfo.indexOf('.') >= 0) {
            // Sometimes we have enums defined as types
            const subType = lookupType(prop.typeInfo);
            if (!subType) {
                throw new Error(`Can not lookup typeInfo of prop=${JSON.stringify(prop)}`);
            }
            if (subType.type === 'enumInfo') {
                result.enum = subType.values;
            } else {
                throw new Error(`Don't know what to do here prop prop=${JSON.stringify(prop)}`);
            }
        }
        // console.log(`${suffix} Result ${JSON.stringify(result)}`);
        props[name] = result;
    });
    indent--;
    return props;
}

/**
 * This function will return a map of properties for given product data type
 */
module.exports = function generateProperties(generatedSchema) {
    mappings = generatedSchema;
    const propertyInfos = generatedSchema.typeInfos.reduce((pInfos, typeInfo) => {
        return [
            ...pInfos,
            ...typeInfo.propertyInfos
        ];
    }, []);

    return toProperties({
        propertyInfos
    });
};
