import Ward from "../models/Ward.js";

/**
 * =======================================
 * GET ALL CITIES
 * =======================================
 * 
 * GOVERNANCE NOTES:
 * - Returns distinct city names from wards collection
 * - Format: [{ label: "Chittoor", value: "chittoor" }]
 * - Sorted alphabetically by label
 */
export const getCities = async (req, res) => {
  try {
    const cities = await Ward.distinct("city");
    
    const cityOptions = cities
      .filter((city) => city && city.trim() !== "")
      .map((city) => {
        const cityLower = city.toLowerCase();
        const cityLabel = cityLower.charAt(0).toUpperCase() + cityLower.slice(1);
        return {
          label: cityLabel,
          value: cityLower,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    return res.status(200).json(cityOptions);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cities",
      error: error.message,
    });
  }
};

/**
 * =======================================
 * GET WARDS BY CITY
 * =======================================
 * 
 * GOVERNANCE NOTES:
 * - City parameter is mandatory
 * - Returns wards sorted by wardNumber
 * - Supports large cities (100+ wards)
 * - Production-ready error handling
 * - Format: [{ _id, label: "Ward 1 (W-001)", value: "W-001", wardNumber: 1 }]
 */
export const getWardsByCity = async (req, res) => {
  try {
    const { city } = req.query;

    // Validate city parameter
    if (!city || typeof city !== "string" || city.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "City parameter is required and must be a non-empty string",
      });
    }

    // Normalize city input and use case-insensitive MongoDB query
    const cityInput = city.trim();
    
    // Fetch wards from database using case-insensitive regex query, sorted by wardNumber
    // This ensures matching regardless of how city is stored or sent
    const wards = await Ward.find({
      city: { $regex: new RegExp(`^${cityInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    })
      .sort({ wardNumber: 1 })
      .select("-__v")
      .lean();

    // Format wards with label and value for frontend
    const formattedWards = wards.map((ward) => ({
      _id: ward._id,
      label: `Ward ${ward.wardNumber} (${ward.code})`,
      value: ward.code,
      wardNumber: ward.wardNumber,
      name: ward.name,
      code: ward.code,
    }));

    return res.status(200).json(formattedWards);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wards",
      error: error.message,
    });
  }
};

/**
 * =======================================
 * CREATE NEW WARD
 * =======================================
 * 
 * GOVERNANCE NOTES:
 * - Validates all required fields
 * - Intended for admin usage (auth to be added later)
 * - Prevents duplicate ward codes
 * - Production-ready validation
 */
export const createWard = async (req, res) => {
  try {
    const { name, wardNumber, code, city } = req.body;

    // Validate all required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Ward name is required and must be a non-empty string",
      });
    }

    if (
      wardNumber === undefined ||
      wardNumber === null ||
      typeof wardNumber !== "number" ||
      wardNumber < 1 ||
      !Number.isInteger(wardNumber)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ward number is required and must be a positive integer",
      });
    }

    if (!code || typeof code !== "string" || code.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Ward code is required and must be a non-empty string",
      });
    }

    if (!city || typeof city !== "string" || city.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "City is required and must be a non-empty string",
      });
    }

    // Normalize city to lowercase
    const normalizedCity = city.trim().toLowerCase();

    // Check for duplicate code
    const existingWard = await Ward.findOne({ code: code.trim() });
    if (existingWard) {
      return res.status(409).json({
        success: false,
        message: `Ward with code '${code.trim()}' already exists`,
      });
    }

    // Create new ward
    const newWard = new Ward({
      name: name.trim(),
      wardNumber: wardNumber,
      code: code.trim(),
      city: normalizedCity,
    });

    const savedWard = await newWard.save();

    return res.status(201).json({
      success: true,
      message: "Ward created successfully",
      data: {
        ward: {
          _id: savedWard._id,
          name: savedWard.name,
          wardNumber: savedWard.wardNumber,
          code: savedWard.code,
          city: savedWard.city,
          createdAt: savedWard.createdAt,
          updatedAt: savedWard.updatedAt,
        },
      },
    });
  } catch (error) {
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `Ward with this ${field} already exists`,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create ward",
      error: error.message,
    });
  }
};
