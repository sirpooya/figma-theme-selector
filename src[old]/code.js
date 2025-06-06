// Show the plugin UI with increased height to accommodate dropdown
figma.showUI(__html__, { width: 400, height: 300 });

let collectionsData = [];

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'apply-theme-mode') {
    try {
      const { selectedMode } = msg.data;
      
      console.log(`Looking for mode "${selectedMode}" in theme collections`);
      
      // Find theme collections (🌈 Theme, 🌈 Theme 2, 🌈 Theme 3, 🌈 Theme 4)
      const themeCollectionNames = ['🌈 Theme', '🌈 Theme 2', '🌈 Theme 3', '🌈 Theme 4'];
      
      let applied = false;
      let appliedCollections = [];
      let sourceCollection = null;
      
      for (const themeCollectionName of themeCollectionNames) {
        try {
          // Find the collection in our loaded data
          const themeCollection = collectionsData.find(c => c.name === themeCollectionName);
          
          if (!themeCollection) {
            console.log(`Collection "${themeCollectionName}" not found in loaded collections`);
            continue;
          }
          
          // Find the mode in this collection
          const mode = themeCollection.modes.find(m => m.name === selectedMode);
          
          if (!mode) {
            console.log(`Mode "${selectedMode}" not found in collection "${themeCollectionName}"`);
            continue;
          }
          
          console.log(`Found mode "${selectedMode}" in collection "${themeCollectionName}"`);
          sourceCollection = themeCollectionName;
          
          // Get the actual collection object
          const collection = await figma.variables.getVariableCollectionByIdAsync(themeCollection.id);
          
          if (!collection) {
            console.log(`Could not get collection object for "${themeCollectionName}"`);
            continue;
          }
          
          // Apply mode to page level only
          const currentPage = figma.currentPage;
          currentPage.setExplicitVariableModeForCollection(collection.id, mode.id);
          
          console.log(`Applied "${selectedMode}" mode to page from collection "${themeCollectionName}"`);
          appliedCollections.push(themeCollectionName);
          applied = true;
          break; // Found and applied, exit loop
          
        } catch (error) {
          console.log(`Error applying mode from "${themeCollectionName}": ${error.message}`);
        }
      }
      
      // Apply cascading theme modes based on source collection
      if (applied && sourceCollection) {
        await applyCascadingModes(sourceCollection, selectedMode);
      }
      
      if (applied) {
        figma.notify(`✅ Applied "${selectedMode}" mode to page`);
        figma.ui.postMessage({
          type: 'success',
          message: '' // Empty message since we're using figma.notify instead
        });
      } else {
        figma.notify(`❌ Mode "${selectedMode}" not found in theme collections`, { error: true });
        figma.ui.postMessage({
          type: 'error',
          message: `Mode "${selectedMode}" not found in any theme collections`
        });
      }
      
    } catch (error) {
      figma.notify(`❌ Error: ${error.message}`, { error: true });
      figma.ui.postMessage({
        type: 'error',
        message: `Error: ${error.message}`
      });
      console.error("Error applying mode:", error);
    }
  }
  
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
  
  if (msg.type === 'config-error') {
    figma.notify(`❌ ${msg.message}`, { error: true });
  }
};

// Function to apply cascading theme modes
async function applyCascadingModes(sourceCollection, selectedMode) {
  try {
    console.log(`Applying cascading modes from source: "${sourceCollection}"`);
    
    const currentPage = figma.currentPage;
    
    if (sourceCollection === '🌈 Theme 2') {
      // Set 🌈 Theme to "Theme 2"
      await setThemeMode('🌈 Theme', 'Theme 2');
      console.log('Applied cascading: 🌈 Theme → Theme 2');
      
    } else if (sourceCollection === '🌈 Theme 3') {
      // Set 🌈 Theme to "Theme 2" and 🌈 Theme 2 to "Theme 3"
      await setThemeMode('🌈 Theme', 'Theme 2');
      await setThemeMode('🌈 Theme 2', 'Theme 3');
      console.log('Applied cascading: 🌈 Theme → Theme 2, 🌈 Theme 2 → Theme 3');
      
    } else if (sourceCollection === '🌈 Theme 4') {
      // Set 🌈 Theme to "Theme 2", 🌈 Theme 2 to "Theme 3", and 🌈 Theme 3 to "Theme 4"
      await setThemeMode('🌈 Theme', 'Theme 2');
      await setThemeMode('🌈 Theme 2', 'Theme 3');
      await setThemeMode('🌈 Theme 3', 'Theme 4');
      console.log('Applied cascading: 🌈 Theme → Theme 2, 🌈 Theme 2 → Theme 3, 🌈 Theme 3 → Theme 4');
    }
    
  } catch (error) {
    console.log(`Error in cascading modes: ${error.message}`);
  }
}

// Helper function to set a specific theme mode
async function setThemeMode(collectionName, modeName) {
  try {
    // Find the collection in our loaded data
    const themeCollection = collectionsData.find(c => c.name === collectionName);
    
    if (!themeCollection) {
      console.log(`Collection "${collectionName}" not found for cascading`);
      return;
    }
    
    // Find the mode in this collection
    const mode = themeCollection.modes.find(m => m.name === modeName);
    
    if (!mode) {
      console.log(`Mode "${modeName}" not found in collection "${collectionName}" for cascading`);
      return;
    }
    
    // Get the actual collection object
    const collection = await figma.variables.getVariableCollectionByIdAsync(themeCollection.id);
    
    if (!collection) {
      console.log(`Could not get collection object for "${collectionName}" for cascading`);
      return;
    }
    
    // Apply mode to page level
    const currentPage = figma.currentPage;
    currentPage.setExplicitVariableModeForCollection(collection.id, mode.id);
    
    console.log(`Cascading: Applied "${modeName}" mode to "${collectionName}"`);
    
  } catch (error) {
    console.log(`Error setting cascading mode for "${collectionName}": ${error.message}`);
  }
}

// Load collections data on plugin start
(async function() {
  try {
    console.log("Loading global library collections...");
    
    // ONLY get global library collections
    const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    console.log(`Found ${libraryCollections.length} global library collections`);
    
    collectionsData = [];
    
    // Process each library collection quickly (no timeout, just try them all)
    for (const libraryCollection of libraryCollections) {
      try {
        console.log(`Processing: "${libraryCollection.name}"`);
        
        // Get variables from library collection
        const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(libraryCollection.key);
        
        if (variables.length === 0) {
          console.log(`No variables in "${libraryCollection.name}"`);
          continue;
        }
        
        // Import one variable to get access to collection modes
        const importedVariable = await figma.variables.importVariableByKeyAsync(variables[0].key);
        const collection = await figma.variables.getVariableCollectionByIdAsync(importedVariable.variableCollectionId);
        
        if (!collection || !collection.modes || collection.modes.length === 0) {
          console.log(`No modes in "${libraryCollection.name}"`);
          continue;
        }
        
        collectionsData.push({
          id: collection.id,
          name: collection.name,
          libraryName: libraryCollection.libraryName,
          isRemote: true,
          modes: collection.modes.map(mode => ({
            id: mode.modeId,
            name: mode.name
          }))
        });
        
        console.log(`Added: "${collection.name}" with ${collection.modes.length} modes`);
        
      } catch (error) {
        console.log(`Failed "${libraryCollection.name}": ${error.message}`);
        continue;
      }
    }
    
    // Send ONLY global collections to UI
    figma.ui.postMessage({
      type: 'collections-loaded', 
      data: collectionsData
    });
    
    figma.notify(`Found ${collectionsData.length} variable collections`);
    console.log(`Loaded ${collectionsData.length} global collections`);
    
  } catch (error) {
    console.error("Error:", error);
    figma.ui.postMessage({
      type: 'collections-loaded', 
      data: []
    });
  }
})();