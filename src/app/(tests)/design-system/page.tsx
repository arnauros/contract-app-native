import { ExampleCard } from "@/components/ExampleCard";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
  Badge,
  ModeToggle,
} from "@/components/ui";

export default function DesignSystemPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Design System</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Example components from our design system
          </p>
        </div>
        <ModeToggle />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Simple Card Example */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Basic Card</CardTitle>
              <Badge>Default</Badge>
            </div>
            <CardDescription>A simple card with basic styling</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is a basic card component from our design system.</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Cancel</Button>
            <Button>Submit</Button>
          </CardFooter>
        </Card>

        {/* Try the ExampleCard if it works */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Interactive Demo</CardTitle>
              <Badge variant="secondary">Demo</Badge>
            </div>
            <CardDescription>Try out our component styles</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This card demonstrates the component library features.</p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="default">
                Default
              </Button>
              <Button size="sm" variant="secondary">
                Secondary
              </Button>
              <Button size="sm" variant="outline">
                Outline
              </Button>
              <Button size="sm" variant="destructive">
                Destructive
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button>Action</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
