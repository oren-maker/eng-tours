import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: data || [] });
  } catch (err) {
    console.error("WhatsApp templates error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, body: templateBody, variables } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing template id" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (templateBody !== undefined) updateData.body = templateBody;
    if (variables !== undefined) updateData.variables = variables;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("whatsapp_templates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating template:", error);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ template: data });
  } catch (err) {
    console.error("WhatsApp template update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
