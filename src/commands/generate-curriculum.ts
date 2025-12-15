/**
 * Parse Learning Requirements Document (LRD) and generate curriculum
 */

import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import chalk from 'chalk';
import { getAIProvider } from '../providers/factory.js';
import { ConfigManager } from '../utils/config.js';
import { generateModulesJson } from '../utils/modules.js';
import { generateInitialState } from '../utils/state.js';

export const generateCurriculumCommand = new Command('generate-curriculum')
  .description('Generate curriculum from Learning Requirements Document')
  .option('-l, --lrd <path>', 'Path to LRD file', './lrd.md')
  .option('-o, --output <path>', 'Output path for curriculum.md', './curriculum.md')
  .option('--force', 'Overwrite existing curriculum')
  .action(async (options) => {
    const lrdFile = options.lrd;
    try {
      console.log(chalk.cyan('📖 Reading Learning Requirements Document...'));

      // Read LRD file
      const lrdContent = await readFile(lrdFile, 'utf-8');
      console.log(chalk.green('   ✓ Read LRD file'));

      // Get AI provider configuration
      const config = new ConfigManager();
      const provider = await config.getProvider();
      const model = await config.getModel();
      const apiKey = await config.getApiKey(provider);

      if (!apiKey) {
        console.error(chalk.red('❌ Error: No API key configured'));
        console.log('Run: codetandem config set-key <provider> <key>');
        process.exit(1);
      }

      console.log(chalk.cyan('🤖 Generating curriculum with AI...'));

      // Create AI provider
      const aiProvider = getAIProvider({
        providerName: provider as any,
        model,
        apiKey,
      });

      // Generate curriculum prompt
      const prompt = `You are an expert curriculum designer. Based on the following Learning Requirements Document (LRD), create a structured learning curriculum in Markdown format.

LRD:
${lrdContent}

Generate a curriculum.md file with this structure:
- Use # (H1) for each module/topic
- Use ## (H2) for learning objectives within each module
- Use bullet points (-) for specific tasks or concepts to learn
- Progress from basics to advanced
- Make it practical and hands-on
- Include 5-10 modules total

Output ONLY the markdown curriculum, no explanations or additional text.`;

      const response = await aiProvider.generateCodeSuggestion(
        prompt,
        {
          description: 'Curriculum generation',
          language: 'markdown',
        },
        0.7
      );

      const curriculumContent = response.content.trim();
      console.log(chalk.green('   ✓ Generated curriculum'));

      // Write curriculum file
      console.log(chalk.cyan(`📝 Writing to ${options.output}...`));
      await writeFile(options.output, curriculumContent, 'utf-8');
      console.log(chalk.green('   ✓ Created curriculum.md'));

      // Generate modules.json
      console.log(chalk.cyan('📚 Generating modules.json...'));
      const modules = await generateModulesJson(options.output, './modules.json');
      console.log(chalk.green(`   ✓ Generated modules.json (${modules.length} modules)`));

      // Generate initial state
      console.log(chalk.cyan('📊 Generating codetandem.state.json...'));
      await generateInitialState({
        modulesPath: './modules.json',
        projectPath: '.',
        outputPath: './codetandem.state.json',
        initialSkillScore: 0.0,
        firstModuleId: modules[0]?.id || 'module-1',
        totalModules: modules.length,
      });
      console.log(chalk.green('   ✓ Generated state file'));

      console.log();
      console.log(chalk.green('✅ Curriculum generated successfully!'));
      console.log();
      console.log(chalk.bold('Curriculum preview:'));
      console.log(chalk.gray('─'.repeat(50)));

      // Show preview
      const lines = curriculumContent.split('\n').slice(0, 15);
      lines.forEach((line) => {
        if (line.startsWith('# ')) {
          console.log(chalk.cyan(line));
        } else if (line.startsWith('## ')) {
          console.log(chalk.yellow(line));
        } else {
          console.log(chalk.gray(line));
        }
      });

      if (curriculumContent.split('\n').length > 15) {
        console.log(chalk.gray('...'));
      }
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log('Next steps:');
      console.log(chalk.cyan('  1. Review curriculum.md and edit if needed'));
      console.log(chalk.cyan('  2. Run: codetandem generate (to regenerate modules)'));
      console.log(chalk.cyan('  3. Run: codetandem status (to check your setup)'));
      console.log(chalk.cyan('  4. Run: codetandem start (to begin learning)'));
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
