const fs = require('fs');
const {spawn} = require('child_process');
const mkdir = require('mkdirp');
const rmrf = require('rmrf');
const ArgumentParser = require('argparse').ArgumentParser;
const schemas = require('./schemas.js');

const parser = new ArgumentParser({
  version: '0.0.1',
  addHelp:true,
  description: 'Argparse example'
});
parser.addArgument(
  [ '-x', '--xsd' ],
  {
    help: 'Path to the xsd file'
  }
);
parser.addArgument(
  [ '-j', '--jsonschema' ],
  {
    help: 'Name of generated JSONSchema file'
  }
);

const args = parser.parseArgs();

const {
    xsd,
    jsonschema
} = args;


function createSchema(filename, generatedSchema) {
    const content = {
        type: 'object',
        title: 'Item'
    };
    content.properties = schemas(generatedSchema);

    fs.writeFileSync(filename, JSON.stringify(content, null, '  '));
}

rmrf('./generated');
mkdir.sync('./generated/schemas');

(async () => {
    await new Promise(resolve => {
        const child = spawn('java', [
            '--add-modules=java.xml.bind,java.activation',
            '-jar',
            'node_modules/jsonix-schema-compiler/lib/jsonix-schema-compiler-full.jar',
            '-generateJsonSchema',
            '-p',
            jsonschema,
            xsd
        ]);

        child.on('close', resolve);

        child.stdout.on('data', buf => {
            console.log(buf.toString());
        });
        child.stderr.on('data', buf => {
            console.log(buf.toString());
        });
    });

    const generatedSchema = require(`./${jsonschema}.js`)[jsonschema];

    fs.unlinkSync(`./${jsonschema}.js`);
    fs.unlinkSync(`./${jsonschema}.jsonschema`);

    const propertyInfos = generatedSchema.typeInfos.reduce((pInfos, typeInfo) => {
        return [
            ...pInfos,
            ...typeInfo.propertyInfos
        ];
    }, []);

    const propertyTypes = propertyInfos.map((t) => t.name);

    const result = require('./component.template.json');

    const actions = result.actions = {};

    createSchema('generated_schema.json', generatedSchema);

    // fs.writeFileSync('./component.json', JSON.stringify(result, null, '  '));
})().then(process.exit, console.error);
