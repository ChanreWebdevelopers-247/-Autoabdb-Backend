// cleanup-database.js
// Run this with: node cleanup-database.js

import mongoose from "mongoose";
import DiseaseData from "../models/diseaseModel.js"; // Adjust path as needed
import connectDB from "../config/db.js";

const cleanupDatabase = async () => {
  try {
    // Connect to MongoDB

    connectDB();
    // Step 1: Find documents with trailing space in autoantibody field
    const documentsWithSpace = await DiseaseData.find({
      "autoantibody ": { $exists: true },
    }).lean();
    console.log(
      `Found ${documentsWithSpace.length} documents with trailing space in autoantibody field`
    );

    // Step 2: Clean up the field names
    let updatedCount = 0;

    for (const doc of documentsWithSpace) {
      const updateOperations = {};
      const unsetOperations = {};

      // Handle autoantibody field with trailing space
      if (doc["autoantibody "]) {
        updateOperations.autoantibody = doc["autoantibody "];
        unsetOperations["autoantibody "] = "";
      }

      // Update the document
      await DiseaseData.updateOne(
        { _id: doc._id },
        {
          $set: updateOperations,
          $unset: unsetOperations,
        }
      );

      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`Updated ${updatedCount} documents...`);
      }
    }

    console.log(`Successfully updated ${updatedCount} documents`);

    // Step 3: Verify the cleanup
    const remainingWithSpace = await DiseaseData.countDocuments({
      "autoantibody ": { $exists: true },
    });
    const totalWithAutoantibody = await DiseaseData.countDocuments({
      autoantibody: { $exists: true },
    });

    console.log("\n--- Verification Results ---");
    console.log(
      `Documents still with "autoantibody " (with space): ${remainingWithSpace}`
    );
    console.log(
      `Documents with "autoantibody" (clean): ${totalWithAutoantibody}`
    );

    // Step 4: Show a sample of the cleaned data
    const sampleDoc = await DiseaseData.findOne({
      disease: "Systemic lupus erythematosus (SLE)",
    }).lean();
    console.log("\n--- Sample cleaned document ---");
    console.log(
      JSON.stringify(
        {
          disease: sampleDoc?.disease,
          autoantibody: sampleDoc?.autoantibody,
          autoantigen: sampleDoc?.autoantigen,
          epitope: sampleDoc?.epitope,
        },
        null,
        2
      )
    );

    console.log("\nCleanup completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
};

cleanupDatabase();
