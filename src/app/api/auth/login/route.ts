import { type NextRequest, NextResponse } from "next/server";

// Force Node.js runtime for bcrypt and crypto operations
export const runtime = "nodejs";
import { validateInput, loginSchema } from "@/lib/validation";
import {
  verifyPassword,
  createJWTToken,
  createSession,
  sanitizeError,
} from "@/lib/security";
import { serialize } from "cookie";
import { findUserByEmail } from "@/lib/services/userService";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = validateInput(loginSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Invalid email or password format",
          details: validation.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user
    const user = await findUserByEmail(email);
    // Use a delay to prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication failed",
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          error: "Authentication failed",
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Check if user is subscribed
    if (!user.isSubscribed) {
      return NextResponse.json(
        {
          error: "Payment required",
          message:
            "Please complete your subscription payment to access your account.",
          requiresPayment: true,
        },
        { status: 402 }
      );
    }

    // Create session
    const sessionData = createSession({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Create JWT token
    const token = await createJWTToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set secure HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    };

    const cookie = serialize("auth-token", token, cookieOptions);

    // Return success response
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );

    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error("Login error:", error);

    const sanitizedError = sanitizeError(error);

    return NextResponse.json(
      {
        error: "Login failed",
        message: sanitizedError.message,
      },
      { status: sanitizedError.status }
    );
  }
}

// Logout endpoint
export async function DELETE(request: NextRequest) {
  try {
    // Clear the auth cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "Logout successful",
      },
      { status: 200 }
    );

    // Set cookie with immediate expiration
    const cookie = serialize("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: 0,
      path: "/",
    });

    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    const sanitizedError = sanitizeError(error);

    return NextResponse.json(
      {
        error: "Logout failed",
        message: sanitizedError.message,
      },
      { status: sanitizedError.status }
    );
  }
}
